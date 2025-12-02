export function normalizeLeader(record) {
  if (!record || typeof record !== 'object') return null;

  const coerceNumber = (value) => {
    if (value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const yearsExperience = coerceNumber(record.years_experience ?? record.yearsExperience);

  return {
    id: record.id ?? null,
    name: typeof record.name === 'string' ? record.name : null,
    jobTitle: typeof record.job_title === 'string' ? record.job_title : null,
    yearsExperience,
    pastCompanies: typeof record.past_companies === 'string' ? record.past_companies : null,
    imageUrl: typeof record.image_url === 'string' ? record.image_url : null,
    createdAt: record.created_at ?? null,
    updatedAt: record.updated_at ?? null,
  };
}

export function sanitizeLeaderPayload(input = {}) {
  const errors = [];

  const nameRaw = typeof input.name === 'string' ? input.name.trim() : '';
  if (!nameRaw) {
    errors.push('Name is required.');
  }

  const jobTitleRaw = typeof input.jobTitle === 'string' ? input.jobTitle.trim() : '';
  const yearsExperienceRaw = input.yearsExperience;
  const pastCompaniesRaw = typeof input.pastCompanies === 'string' ? input.pastCompanies.trim() : '';
  const imageUrlRaw = typeof input.imageUrl === 'string' ? input.imageUrl.trim() : '';

  let yearsExperience = null;
  if (yearsExperienceRaw !== null && yearsExperienceRaw !== undefined && String(yearsExperienceRaw).trim() !== '') {
    const parsedYears = Number(yearsExperienceRaw);
    if (!Number.isFinite(parsedYears) || parsedYears < 0) {
      errors.push('Years of experience must be a non-negative number.');
    } else {
      yearsExperience = Math.round(parsedYears);
    }
  }

  const payload = {
    name: nameRaw || null,
    jobTitle: jobTitleRaw || null,
    yearsExperience,
    pastCompanies: pastCompaniesRaw || null,
    imageUrl: imageUrlRaw || null,
  };

  return { payload, errors };
}
