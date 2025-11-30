import { Buffer } from 'buffer';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { MAX_RESOURCE_FILE_SIZE_BYTES, RESOURCE_TYPE_SET, RESOURCE_TYPE_VALUES } from '/lib/resources/constants';
import { normalizeResourceRecord } from '/lib/resources/normalizers';
import { selectResourceById, mapSchemaOutdatedError } from '/lib/resources/db';
import { LESSON_RESOURCE_BUCKET } from '/lib/resources/storage';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

function parseSequence(value) {
  if (value === undefined || value === null) return undefined;
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

async function uploadReplacementFile(supabase, lessonId, file) {
  if (!lessonId) {
    throw new Error('Lesson id missing for resource.');
  }

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

async function deleteStoragePath(supabase, storagePath) {
  if (!storagePath) return;
  const { error } = await supabase.storage.from(LESSON_RESOURCE_BUCKET).remove([storagePath]);
  if (error && error.status !== 404) {
    console.warn('[api/admin/resources] Failed to delete storage object', { storagePath, error });
  }
}

async function loadResource(supabase, resourceId) {
  const { resource, schemaOutdated } = await selectResourceById(supabase, (query) => query.eq('id', resourceId));
  if (schemaOutdated) {
    const error = new Error('Lesson resources require the migration.');
    error.code = 'RESOURCE_SCHEMA_OUTDATED';
    throw error;
  }

  if (!resource) {
    const error = new Error('Resource not found.');
    error.code = 'RESOURCE_NOT_FOUND';
    throw error;
  }

  return resource;
}

export async function PATCH(request, context) {
  try {
    const rawParams = context?.params;
    const resolvedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const resourceId = resolvedParams?.resourceId;

    if (!resourceId) {
      return NextResponse.json({ error: 'Resource id is required.' }, { status: 400 });
    }

    const contentTypeHeader = request.headers.get('content-type') ?? '';
    const isMultipart = contentTypeHeader.includes('multipart/form-data');

    const supabase = createSupabaseServiceClient();

    let current;
    try {
      current = await loadResource(supabase, resourceId);
    } catch (loadError) {
      if (loadError?.code === 'RESOURCE_SCHEMA_OUTDATED') {
        return NextResponse.json({
          error: 'Lesson resources require the latest database migration (20251129_update_downloads_table.sql).',
        }, { status: 409 });
      }
      if (loadError?.code === 'RESOURCE_NOT_FOUND') {
        return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
      }
      const mapped = mapSchemaOutdatedError(loadError);
      if (mapped !== loadError) {
        return NextResponse.json({ error: mapped.message }, { status: 409 });
      }
      throw loadError;
    }

    let updates = {};
    let newType = null;
    let newUrl = null;
    let newSequence = undefined;
    let newTitle = null;
    let fileUploadResult = null;
    let fileProvided = false;

    if (isMultipart) {
      const formData = await request.formData();
      if (formData.has('title')) {
        newTitle = String(formData.get('title') ?? '').trim();
        if (!newTitle) {
          return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
        }
      }

      if (formData.has('sequence')) {
        newSequence = parseSequence(formData.get('sequence'));
        if (Number.isNaN(newSequence)) {
          return NextResponse.json({ error: 'Sequence must be a number.' }, { status: 400 });
        }
      }

      if (formData.has('type')) {
        const typeRaw = String(formData.get('type') ?? '').toLowerCase();
        if (!RESOURCE_TYPE_SET.has(typeRaw)) {
          return NextResponse.json({
            error: `Type must be one of: ${RESOURCE_TYPE_VALUES.join(', ')}.`,
          }, { status: 400 });
        }
        newType = typeRaw;
      }

      if (formData.has('externalUrl')) {
        newUrl = sanitizeUrl(formData.get('externalUrl'));
        if (!newUrl) {
          return NextResponse.json({ error: 'A valid URL is required.' }, { status: 400 });
        }
      }

      if (formData.has('file')) {
        const file = formData.get('file');
        if (file instanceof File) {
          fileProvided = true;
          fileUploadResult = await uploadReplacementFile(supabase, current.lessonId, file);
        }
      }
    } else {
      const body = await request.json();
      if (Object.prototype.hasOwnProperty.call(body ?? {}, 'title')) {
        newTitle = String(body.title ?? '').trim();
        if (!newTitle) {
          return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
        }
      }

      if (Object.prototype.hasOwnProperty.call(body ?? {}, 'sequence')) {
        newSequence = parseSequence(body.sequence);
        if (Number.isNaN(newSequence)) {
          return NextResponse.json({ error: 'Sequence must be a number.' }, { status: 400 });
        }
      }

      if (Object.prototype.hasOwnProperty.call(body ?? {}, 'type')) {
        const typeRaw = String(body.type ?? '').toLowerCase();
        if (!RESOURCE_TYPE_SET.has(typeRaw)) {
          return NextResponse.json({
            error: `Type must be one of: ${RESOURCE_TYPE_VALUES.join(', ')}.`,
          }, { status: 400 });
        }
        newType = typeRaw;
      }

      if (Object.prototype.hasOwnProperty.call(body ?? {}, 'externalUrl')) {
        newUrl = sanitizeUrl(body.externalUrl);
        if (!newUrl) {
          return NextResponse.json({ error: 'A valid URL is required.' }, { status: 400 });
        }
      }
    }

    if (newTitle !== null) {
      updates.title = newTitle;
    }

    if (newSequence !== undefined) {
      updates.sequence = newSequence;
    }

    if (newType) {
      updates.resource_type = newType;
    }

    if (fileUploadResult) {
      updates.file_url = fileUploadResult.fileUrl;
      updates.storage_path = fileUploadResult.storagePath;
      updates.mime_type = fileUploadResult.mimeType;
      updates.file_size = fileUploadResult.fileSize;
      updates.external_url = null;
    }

    if (newUrl !== null) {
      updates.external_url = newUrl;
      updates.file_url = newUrl;
      updates.storage_path = null;
      updates.mime_type = null;
      updates.file_size = null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No changes provided.' }, { status: 400 });
    }

    if (updates.resource_type && updates.resource_type === 'file' && !fileProvided && !fileUploadResult) {
      return NextResponse.json({
        error: 'Upload a replacement file when switching to a downloadable resource.',
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('downloads')
      .update(updates)
      .eq('id', resourceId)
      .select(
        'id, lesson_id, title, resource_type, file_url, external_url, storage_path, mime_type, file_size, sequence, created_at, updated_at'
      )
      .maybeSingle();

    if (error) {
      if (error.code === '42703') {
        return NextResponse.json({
          error: 'Lesson resources require the latest database migration (20251129_update_downloads_table.sql).',
        }, { status: 409 });
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
    }

    if (fileUploadResult && current.storagePath && current.storagePath !== fileUploadResult.storagePath) {
      await deleteStoragePath(supabase, current.storagePath);
    }

    if (newUrl !== null && current.storagePath) {
      await deleteStoragePath(supabase, current.storagePath);
    }

    const resource = normalizeResourceRecord(data);
    return NextResponse.json({ resource });
  } catch (error) {
    const mapped = mapSchemaOutdatedError(error);
    if (mapped !== error) {
      return NextResponse.json({ error: mapped.message }, { status: 409 });
    }
    console.error('[api/admin/resources] Failed to update resource', error);
    return NextResponse.json({ error: 'Unable to update resource.' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const rawParams = context?.params;
    const resolvedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const resourceId = resolvedParams?.resourceId;

    if (!resourceId) {
      return NextResponse.json({ error: 'Resource id is required.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    let current;
    try {
      current = await loadResource(supabase, resourceId);
    } catch (loadError) {
      if (loadError?.code === 'RESOURCE_SCHEMA_OUTDATED') {
        return NextResponse.json({
          error: 'Lesson resources require the latest database migration (20251129_update_downloads_table.sql).',
        }, { status: 409 });
      }
      if (loadError?.code === 'RESOURCE_NOT_FOUND') {
        return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
      }
      const mapped = mapSchemaOutdatedError(loadError);
      if (mapped !== loadError) {
        return NextResponse.json({ error: mapped.message }, { status: 409 });
      }
      throw loadError;
    }

    const { error } = await supabase.from('downloads').delete().eq('id', resourceId);
    if (error) throw error;

    if (current.storagePath) {
      await deleteStoragePath(supabase, current.storagePath);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[api/admin/resources] Failed to delete resource', error);
    return NextResponse.json({ error: 'Unable to delete resource.' }, { status: 500 });
  }
}
