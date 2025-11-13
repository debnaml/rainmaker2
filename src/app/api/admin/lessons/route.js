import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { derivePresenterDisplayName } from '/lib/presenters';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

const SELECT_COLUMNS = [
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
      isEnhancedOnly = false,
      presenterIds = [],
    } = body ?? {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    const sanitizedPresenterIds = Array.isArray(presenterIds)
      ? Array.from(
          new Set(
            presenterIds
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

    const supabase = createSupabaseServiceClient();

    const lessonId = randomUUID();

    const { data, error } = await supabase
      .from('lessons')
      .insert({
        id: lessonId,
        title: title.trim(),
        module_id: moduleId || null,
        format: format || null,
        duration: duration || null,
        image_url: imageUrl || null,
        url: externalUrl || null,
        is_enhanced_only: Boolean(isEnhancedOnly),
      })
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

    const lesson = normalizeLessonRow(data, presenters);

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    console.error('[api/admin/lessons] Failed to create lesson', error);
    return NextResponse.json({ error: 'Unable to create lesson.' }, { status: 500 });
  }
}

function normalizeLessonRow(row, presenters = []) {
  if (!row) return null;
  const { modules, ...rest } = row;
  let moduleRecord = null;

  if (Array.isArray(modules) && modules.length > 0) {
    moduleRecord = modules[0];
  } else if (modules && typeof modules === 'object') {
    moduleRecord = modules;
  }

  return {
    ...rest,
    module: moduleRecord,
    tags: [],
    presenters,
  };
}
