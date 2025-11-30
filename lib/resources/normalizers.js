import { RESOURCE_TYPE_SET } from './constants';

export function normalizeResourceRecord(record) {
  if (!record) return null;

  const rawType = typeof record.resource_type === 'string'
    ? record.resource_type.toLowerCase()
    : typeof record.type === 'string'
      ? record.type.toLowerCase()
      : null;

  const fileUrl = record.file_url ?? record.fileUrl ?? record.url ?? null;
  const externalUrl = record.external_url ?? record.externalUrl ?? record.url ?? null;

  let resourceType = RESOURCE_TYPE_SET.has(rawType) ? rawType : null;

  if (!resourceType) {
    if (externalUrl && !record.storage_path && !record.storagePath) {
      resourceType = 'link';
    } else {
      resourceType = 'file';
    }
  }

  const baseUrl = (() => {
    if (resourceType === 'file') {
      return fileUrl ?? externalUrl ?? null;
    }
    return externalUrl ?? fileUrl ?? null;
  })();

  return {
    id: record.id,
    lessonId: record.lesson_id ?? record.lessonId ?? null,
    title: record.title ?? 'Untitled resource',
    type: resourceType,
    url: baseUrl,
    storagePath: record.storage_path ?? record.storagePath ?? null,
    mimeType: record.mime_type ?? record.mimeType ?? null,
    fileSize: record.file_size ?? record.fileSize ?? record.size ?? null,
    sequence: record.sequence ?? record.order ?? null,
    createdAt: record.created_at ?? record.createdAt ?? null,
    updatedAt: record.updated_at ?? record.updatedAt ?? null,
  };
}

export function sortResources(records = []) {
  return [...records].sort((a, b) => {
    const sequenceA = Number.isFinite(a.sequence) ? a.sequence : Number.MAX_SAFE_INTEGER;
    const sequenceB = Number.isFinite(b.sequence) ? b.sequence : Number.MAX_SAFE_INTEGER;
    if (sequenceA !== sequenceB) return sequenceA - sequenceB;
    return (a.title ?? '').localeCompare(b.title ?? '', undefined, { sensitivity: 'base' });
  });
}
