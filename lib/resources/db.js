import { normalizeResourceRecord, sortResources } from './normalizers.js';

const RESOURCE_SELECT_COLUMNS = 'id, lesson_id, title, resource_type, file_url, external_url, storage_path, mime_type, file_size, sequence, created_at, updated_at';
const POSTGRES_UNDEFINED_COLUMN = '42703';

function applyFilters(builder, configure) {
  if (typeof configure !== 'function') {
    return builder;
  }
  return configure(builder) ?? builder;
}

export async function selectResourceCollection(supabase, configure) {
  let query = applyFilters(supabase.from('downloads').select(RESOURCE_SELECT_COLUMNS), configure);
  let { data, error } = await query;

  let schemaOutdated = false;
  if (error) {
    if (error.code === POSTGRES_UNDEFINED_COLUMN) {
      schemaOutdated = true;
      query = applyFilters(supabase.from('downloads').select('*'), configure);
      const fallback = await query;
      data = fallback.data;
      error = fallback.error;
    }
  }

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data) ? data : [];
  const normalized = rows.map((row) => normalizeResourceRecord(row)).filter(Boolean);
  return {
    resources: sortResources(normalized),
    schemaOutdated,
  };
}

export async function selectResourceById(supabase, configure) {
  let query = applyFilters(supabase.from('downloads').select(RESOURCE_SELECT_COLUMNS), configure);
  let { data, error } = await query.maybeSingle();

  let schemaOutdated = false;
  if (error) {
    if (error.code === POSTGRES_UNDEFINED_COLUMN) {
      schemaOutdated = true;
      query = applyFilters(supabase.from('downloads').select('*'), configure);
      const fallback = await query.maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }
  }

  if (error) {
    throw error;
  }

  return {
    resource: data ? normalizeResourceRecord(data) : null,
    schemaOutdated,
  };
}

export function mapSchemaOutdatedError(error) {
  if (error && error.code === POSTGRES_UNDEFINED_COLUMN) {
    return new Error('Lesson resources require the latest database migration (20251129_update_downloads_table.sql).');
  }
  return error;
}
