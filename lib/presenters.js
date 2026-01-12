export function derivePresenterDisplayName(record) {
  if (!record || typeof record !== 'object') return null;

  const candidates = [];

  const pushCandidate = (value) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      candidates.push(trimmed);
    }
  };

  pushCandidate(record.name);
  pushCandidate(record.full_name);
  pushCandidate(record.fullName);
  pushCandidate(record.display_name);
  pushCandidate(record.displayName);

  const firstName = typeof record.first_name === 'string' ? record.first_name.trim() : '';
  const lastName = typeof record.last_name === 'string' ? record.last_name.trim() : '';
  const combined = [firstName, lastName].filter((part) => part.length > 0).join(' ');
  pushCandidate(combined);

  pushCandidate(record.title);
  pushCandidate(record.label);
  pushCandidate(record.nickname);

  return candidates.length > 0 ? candidates[0] : null;
}

export function normalizePresenter(record) {
  if (!record || typeof record !== 'object') return null;

  const displayName = derivePresenterDisplayName(record);
  if (!displayName) return null;

  return {
    id: record.id ?? null,
    name: displayName,
    createdAt: record.created_at ?? null,
    updatedAt: record.updated_at ?? null,
  };
}

export function sanitizePresenterPayload(input = {}) {
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

export function collectPresenterNames(source) {
  if (!source || typeof source !== 'object') return [];

  const rawValues = [
    source.presenters,
    source.presenter,
    source.facilitators,
    source.facilitator,
    source.instructors,
    source.instructor,
  ];

  const values = rawValues
    .flatMap((value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      return [value];
    })
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') return item;
      if (typeof item.name === 'string') return item.name;
      if (typeof item.fullName === 'string') return item.fullName;
      if (typeof item.full_name === 'string') return item.full_name;
      return null;
    })
    .filter((name) => typeof name === 'string' && name.trim().length > 0)
    .map((name) => name.trim());

  return [...new Set(values)];
}
