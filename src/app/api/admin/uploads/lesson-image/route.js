import { Buffer } from 'buffer';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { LESSON_IMAGE_BUCKET, MAX_LESSON_IMAGE_SIZE_BYTES } from '/lib/lessons/storage';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

const FALLBACK_CONTENT_TYPE = 'image/jpeg';

function slugifyFilename(value) {
  if (!value) return 'lesson-image';
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200) || 'lesson-image';
}

function buildStoragePath(filename) {
  const safeName = slugifyFilename(filename);
  return `${randomUUID()}/${randomUUID()}-${safeName}`;
}

function isImageMimeType(mimeType) {
  return typeof mimeType === 'string' && mimeType.toLowerCase().startsWith('image/');
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Upload a valid image file.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const byteLength = arrayBuffer.byteLength;

    if (byteLength === 0) {
      return NextResponse.json({ error: 'The provided file is empty.' }, { status: 400 });
    }

    if (Number.isFinite(MAX_LESSON_IMAGE_SIZE_BYTES) && byteLength > MAX_LESSON_IMAGE_SIZE_BYTES) {
      return NextResponse.json({
        error: `Image exceeds the ${(MAX_LESSON_IMAGE_SIZE_BYTES / (1024 * 1024)).toFixed(1)}MB limit.`,
      }, { status: 400 });
    }

    const contentType = file.type || FALLBACK_CONTENT_TYPE;

    if (!isImageMimeType(contentType)) {
      return NextResponse.json({ error: 'Only image uploads are supported.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const storagePath = buildStoragePath(file.name);
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage.from(LESSON_IMAGE_BUCKET).upload(storagePath, buffer, {
      contentType,
      upsert: false,
      cacheControl: '3600',
    });

    if (uploadError) {
      console.error('[api/admin/uploads/lesson-image] Storage upload failed', uploadError);
      return NextResponse.json({ error: 'Unable to upload image.' }, { status: 500 });
    }

    const { data: publicUrlData, error: publicUrlError } = supabase.storage.from(LESSON_IMAGE_BUCKET).getPublicUrl(storagePath);

    if (publicUrlError) {
      console.error('[api/admin/uploads/lesson-image] Failed to resolve public URL', publicUrlError);
      return NextResponse.json({ error: 'Unable to resolve uploaded image URL.' }, { status: 500 });
    }

    const publicUrl = publicUrlData?.publicUrl ?? null;
    if (!publicUrl) {
      console.error('[api/admin/uploads/lesson-image] Missing public URL after upload', { storagePath });
      return NextResponse.json({ error: 'Uploaded image is not publicly accessible.' }, { status: 500 });
    }

    return NextResponse.json(
      {
        url: publicUrl,
        path: storagePath,
        bytes: byteLength,
        contentType,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/admin/uploads/lesson-image] Unexpected error during image upload', error);
    return NextResponse.json({ error: 'Unable to upload image.' }, { status: 500 });
  }
}
