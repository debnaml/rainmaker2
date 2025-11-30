import { Buffer } from 'buffer';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { normalizeResourceRecord } from '/lib/resources/normalizers';
import { RESOURCE_TYPE_SET, RESOURCE_TYPE_VALUES, MAX_RESOURCE_FILE_SIZE_BYTES } from '/lib/resources/constants';
import { LESSON_RESOURCE_BUCKET } from '/lib/resources/storage';
import { createSupabaseServiceClient } from '/lib/supabaseServer';
import { selectResourceCollection, mapSchemaOutdatedError } from '/lib/resources/db';

function parseSequence(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) return Number.NaN;
    return numeric;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return Number.NaN;
  return numeric;
}

function sanitizeUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    return url.toString();
  } catch (error) {
    return null;
  }
}

function slugifyFilename(value) {
  if (!value) return `resource-${Date.now()}`;
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

async function uploadFileToStorage(supabase, lessonId, file) {
  const fileName = slugifyFilename(file.name ?? 'resource');
  const storageKey = `${lessonId}/${randomUUID()}-${fileName}`;
  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_RESOURCE_FILE_SIZE_BYTES) {
    throw new Error('File exceeds the 50MB upload limit.');
  }
  const buffer = Buffer.from(arrayBuffer);

  const contentType = file.type || 'application/octet-stream';

  const { error: uploadError } = await supabase.storage
    .from(LESSON_RESOURCE_BUCKET)
    .upload(storageKey, buffer, {
      contentType,
      upsert: false,
      cacheControl: '3600',
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabase.storage.from(LESSON_RESOURCE_BUCKET).getPublicUrl(storageKey);
  const publicUrl = publicUrlData?.publicUrl ?? null;

  return {
    storagePath: storageKey,
    fileUrl: publicUrl,
    mimeType: contentType,
    fileSize: buffer.byteLength,
  };
}

async function ensureLessonExists(supabase, lessonId) {
  const { data, error } = await supabase.from('lessons').select('id').eq('id', lessonId).maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error('Lesson not found.');
  }
}

export async function GET(request, context) {
  try {
    const rawParams = context?.params;
    const resolvedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const lessonId = resolvedParams?.lessonId;

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson id is required.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    await ensureLessonExists(supabase, lessonId);

    const { resources, schemaOutdated } = await selectResourceCollection(supabase, (query) => query.eq('lesson_id', lessonId));

    if (schemaOutdated) {
      return NextResponse.json(
        {
          error: 'Lesson resources require the latest database migration (20251129_update_downloads_table.sql).',
          resources: [],
          resourcesSchemaOutdated: true,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ resources });
  } catch (error) {
    const mapped = mapSchemaOutdatedError(error);
    if (mapped !== error) {
      return NextResponse.json({ error: mapped.message }, { status: 409 });
    }
    console.error('[api/admin/lessons/resources] Failed to load resources', error);
    return NextResponse.json({ error: 'Unable to load lesson resources.' }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const rawParams = context?.params;
    const resolvedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const lessonId = resolvedParams?.lessonId;

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson id is required.' }, { status: 400 });
    }

    const formData = await request.formData();
    const title = String(formData.get('title') ?? '').trim();
    const typeRaw = String(formData.get('type') ?? '').toLowerCase();
    const sequenceValue = parseSequence(formData.get('sequence'));
    const externalUrlRaw = formData.get('externalUrl');
    const file = formData.get('file');

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    if (!RESOURCE_TYPE_SET.has(typeRaw)) {
      return NextResponse.json({
        error: `Type must be one of: ${RESOURCE_TYPE_VALUES.join(', ')}.`,
      }, { status: 400 });
    }

    if (Number.isNaN(sequenceValue)) {
      return NextResponse.json({ error: 'Sequence must be a number.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    await ensureLessonExists(supabase, lessonId);

    const insertRow = {
      id: randomUUID(),
      lesson_id: lessonId,
      title,
      resource_type: typeRaw,
      sequence: sequenceValue,
    };

    if (typeRaw === 'file') {
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'An upload is required for file resources.' }, { status: 400 });
      }

      const uploadResult = await uploadFileToStorage(supabase, lessonId, file);
      insertRow.file_url = uploadResult.fileUrl;
      insertRow.storage_path = uploadResult.storagePath;
      insertRow.mime_type = uploadResult.mimeType;
      insertRow.file_size = uploadResult.fileSize;
      insertRow.external_url = null;
    } else {
      const sanitizedUrl = sanitizeUrl(externalUrlRaw);
      if (!sanitizedUrl) {
        return NextResponse.json({ error: 'A valid URL is required.' }, { status: 400 });
      }
      insertRow.external_url = sanitizedUrl;
      insertRow.file_url = sanitizedUrl;
      insertRow.storage_path = null;
      insertRow.mime_type = null;
      insertRow.file_size = null;
    }

    const { data, error } = await supabase
      .from('downloads')
      .insert(insertRow)
      .select(
        'id, lesson_id, title, resource_type, file_url, external_url, storage_path, mime_type, file_size, sequence, created_at, updated_at'
      )
      .maybeSingle();

    if (error) {
      if (error.code === '42703') {
        return NextResponse.json(
          { error: 'Lesson resources require the latest database migration (20251129_update_downloads_table.sql).' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ resource: normalizeResourceRecord(data) }, { status: 201 });
  } catch (error) {
    const mapped = mapSchemaOutdatedError(error);
    if (mapped !== error) {
      return NextResponse.json({ error: mapped.message }, { status: 409 });
    }
    console.error('[api/admin/lessons/resources] Failed to create resource', error);
    return NextResponse.json({ error: 'Unable to create resource.' }, { status: 500 });
  }
}
