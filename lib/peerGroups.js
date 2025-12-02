export function normalizePeerGroup(record) {
  if (!record || typeof record !== 'object') return null;

  const id = record.id ?? null;
  const title = typeof record.title === 'string' ? record.title.trim() : '';

  if (!id || !title) {
    return null;
  }

  return {
    id,
    name: title,
    createdAt: record.created_at ?? null,
    updatedAt: record.updated_at ?? null,
  };
}

export function sanitizePeerGroupPayload(input = {}) {
  const errors = [];

  const nameRaw = typeof input.name === 'string' ? input.name.trim() : '';
  if (!nameRaw) {
    errors.push('Name is required.');
  }

  return {
    payload: {
      name: nameRaw || null,
    },
    errors,
  };
}
