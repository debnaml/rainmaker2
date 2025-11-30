import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { derivePresenterDisplayName } from '/lib/presenters';
import { normalizeResourceRecord, sortResources } from '/lib/resources/normalizers';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

export const SELECT_COLUMNS = [
  'id',
  'module_id',
  'title',
  'description',
  'image_url',
  'format',
  'duration',
  'url',
  'sequence',
  'is_enhanced_only',
  'created_at',
  'modules(id, title, type, sequence)',
];

export function parseSequenceValue(sequence, { allowUndefined = false } = {}) {
  if (sequence === undefined) {
    return allowUndefined ? { valid: true, value: undefined } : { valid: true, value: null };
  }

  if (sequence === null) {
    return { valid: true, value: null };
  }

  if (typeof sequence === 'number') {
    if (!Number.isFinite(sequence)) {
      return { valid: false, value: null };
    }
    return { valid: true, value: sequence };
  }

  if (typeof sequence === 'string') {
    const trimmed = sequence.trim();
    if (!trimmed) {
      return { valid: true, value: null };
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return { valid: false, value: null };
    }

    return { valid: true, value: parsed };
  }

  return { valid: false, value: null };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title,
      moduleId = null,
      format = null,
      duration = null,
      imageUrl = null,
      externalUrl = null,
      sequence,
      isEnhancedOnly = false,
      presenterIds = [],
      tags = [],
    } = body ?? {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    const sanitizedPresenterIds = sanitizePresenterIds(presenterIds);
    const sanitizedTags = sanitizeTags(tags);
    const sequenceResult = parseSequenceValue(sequence, { allowUndefined: true });
    if (!sequenceResult.valid) {
      return NextResponse.json({ error: 'Sequence must be a number.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const lessonId = randomUUID();

    const newLessonRow = {
      id: lessonId,
      title: title.trim(),
      module_id: moduleId || null,
      format: format || null,
      duration: duration || null,
      image_url: imageUrl || null,
      url: externalUrl || null,
      is_enhanced_only: Boolean(isEnhancedOnly),
    };

    if (sequenceResult.value !== undefined) {
      newLessonRow.sequence = sequenceResult.value;
    }

    const { data, error } = await supabase
      .from('lessons')
      .insert(newLessonRow)
      .select(SELECT_COLUMNS.join(', '))
      .maybeSingle();

    if (error) throw error;

    let presenters = [];

    if (data?.id && sanitizedPresenterIds.length > 0) {
      const presenterLinkRows = sanitizedPresenterIds.map((presenterId) => {
        const numericId = Number(presenterId);
        const value = Number.isFinite(numericId) ? numericId : presenterId;
        return {
          lesson_id: data.id,
          presenter_id: value,
        };
      });

      try {
        const { error: presenterLinkError } = await supabase.from('lesson_presenters').insert(presenterLinkRows);
        if (presenterLinkError) {
          throw presenterLinkError;
        }
      } catch (presenterLinkError) {
        console.error('[api/admin/lessons] Failed to link presenters to lesson', presenterLinkError);
        const { error: cleanupError } = await supabase.from('lessons').delete().eq('id', data.id);
        if (cleanupError) {
          console.error('[api/admin/lessons] Failed to roll back lesson after presenter link error', cleanupError);
        }
        throw presenterLinkError;
      }

      try {
        const presenterFilterValues = presenterLinkRows.map((row) => row.presenter_id);
        const { data: presenterRows, error: presenterFetchError } = await supabase
          .from('presenters')
          .select('*')
          .in('id', presenterFilterValues);

        if (presenterFetchError) {
          throw presenterFetchError;
        }

        const orderMap = new Map(sanitizedPresenterIds.map((value, index) => [value, index]));

        presenters = Array.isArray(presenterRows)
          ? presenterRows
              .map((record) => {
                const displayName = derivePresenterDisplayName(record);
                if (!record?.id || !displayName) return null;
                return {
                  id: record.id,
                  name: displayName,
                };
              })
              .filter(Boolean)
              .sort((a, b) => {
                const aKey = String(a.id);
                const bKey = String(b.id);
                const aOrder = orderMap.has(aKey) ? orderMap.get(aKey) : Number.MAX_SAFE_INTEGER;
                const bOrder = orderMap.has(bKey) ? orderMap.get(bKey) : Number.MAX_SAFE_INTEGER;
                return aOrder - bOrder;
              })
          : [];
      } catch (presenterFetchError) {
        console.error('[api/admin/lessons] Failed to fetch presenter details for lesson', presenterFetchError);
      }
    }

    if (data?.id && sanitizedTags.length > 0) {
      const tagRows = sanitizedTags.map((tag) => ({
        lesson_id: data.id,
        tag,
      }));

      try {
        const { error: tagInsertError } = await supabase.from('lesson_tags').insert(tagRows);
        if (tagInsertError) {
          throw tagInsertError;
        }
      } catch (tagInsertError) {
        console.error('[api/admin/lessons] Failed to attach tags to lesson', tagInsertError);
        try {
          await supabase.from('lesson_presenters').delete().eq('lesson_id', data.id);
        } catch (cleanupLinkError) {
          console.error('[api/admin/lessons] Failed to remove presenter links after tag error', cleanupLinkError);
        }
        const { error: cleanupLessonError } = await supabase.from('lessons').delete().eq('id', data.id);
        if (cleanupLessonError) {
          console.error('[api/admin/lessons] Failed to roll back lesson after tag error', cleanupLessonError);
        }
        throw tagInsertError;
      }
    }

    const resources = [];
    const lesson = normalizeLessonRow(data, presenters, sanitizedTags, resources);

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    console.error('[api/admin/lessons] Failed to create lesson', error);
    return NextResponse.json({ error: 'Unable to create lesson.' }, { status: 500 });
  }
}

export function sanitizePresenterIds(input) {
  return Array.isArray(input)
    ? Array.from(
        new Set(
          input
            .map((value) => {
              if (value === null || value === undefined) return null;
              if (typeof value === 'object' && value !== null && 'id' in value) {
                return String(value.id);
              }
              if (typeof value === 'string') {
                return value.trim();
              }
              if (typeof value === 'number' && Number.isFinite(value)) {
                return String(value);
              }
              return null;
            })
            .filter((value) => typeof value === 'string' && value.length > 0)
        )
      )
    : [];
}

export function normalizeLessonRow(row, presenters = [], tags = [], resources = []) {
  if (!row) return null;
  const { modules, ...rest } = row;
  let moduleRecord = null;

  if (Array.isArray(modules) && modules.length > 0) {
    moduleRecord = modules[0];
  } else if (modules && typeof modules === 'object') {
    moduleRecord = modules;
  }

  const normalizedResources = Array.isArray(resources)
    ? resources
        .map((item) => {
          if (!item) return null;
          if (typeof item === 'object' && 'type' in item && 'url' in item) {
            return item;
          }
          return normalizeResourceRecord(item);
        })
        .filter(Boolean)
    : [];

  return {
    ...rest,
    module: moduleRecord,
    tags,
    presenters,
    resources: sortResources(normalizedResources),
  };
}

export function sanitizeTags(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Map();
  input.forEach((value) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, trimmed);
      }
      return;
    }
    if (typeof value === 'object' && value !== null && 'name' in value) {
      const raw = String(value.name ?? '').trim();
      if (!raw) return;
      const key = raw.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, raw);
      }
      return;
    }
  });
  return Array.from(seen.values()).slice(0, 25);
}
