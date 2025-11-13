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
