export const LEADER_IMAGE_BUCKET = process.env.SUPABASE_LEADER_IMAGE_BUCKET || 'leader-photos';
export const MAX_LEADER_IMAGE_SIZE_BYTES = Number(process.env.SUPABASE_LEADER_IMAGE_MAX_BYTES || 5 * 1024 * 1024);
