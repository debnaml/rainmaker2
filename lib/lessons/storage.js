export const LESSON_IMAGE_BUCKET = process.env.SUPABASE_LESSON_IMAGE_BUCKET || 'lesson-images';
export const MAX_LESSON_IMAGE_SIZE_BYTES = Number(process.env.SUPABASE_LESSON_IMAGE_MAX_BYTES || 5 * 1024 * 1024);
