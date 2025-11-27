import { NextResponse } from 'next/server';
import { derivePresenterDisplayName } from '/lib/presenters';
import { createSupabaseServiceClient } from '/lib/supabaseServer';
import { normalizeLessonRow, sanitizePresenterIds, sanitizeTags, SELECT_COLUMNS } from '../route';

async function fetchLessonRecord(supabase, lessonId) {
  const { data, error } = await supabase
    .from('lessons')
    .select(SELECT_COLUMNS.join(', '))
    .eq('id', lessonId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchPresenterLinks(supabase, lessonId) {
  const { data, error } = await supabase
    .from('lesson_presenters')
    .select('presenter_id')
    .eq('lesson_id', lessonId)
    .order('presenter_id', { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function fetchTags(supabase, lessonId) {
  const { data, error } = await supabase
    .from('lesson_tags')
    .select('tag')
    .eq('lesson_id', lessonId)
    .order('tag', { ascending: true });

  if (error) throw error;
  const tagValues = Array.isArray(data) ? data.map((row) => row?.tag).filter((value) => typeof value === 'string') : [];
  return sanitizeTags(tagValues);
}

async function loadPresentersByIds(supabase, presenterIds, orderMap = new Map()) {
  if (!presenterIds.length) return [];

  const { data, error } = await supabase
    .from('presenters')
    .select('*')
    .in('id', presenterIds);

  if (error) throw error;

  return (Array.isArray(data) ? data : [])
    .map((record) => {
      const displayName = derivePresenterDisplayName(record);
      if (!record?.id || !displayName) return null;
      return { id: record.id, name: displayName };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aKey = String(a.id);
      const bKey = String(b.id);
      const aOrder = orderMap.has(aKey) ? orderMap.get(aKey) : Number.MAX_SAFE_INTEGER;
      const bOrder = orderMap.has(bKey) ? orderMap.get(bKey) : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
}

export async function GET(request, context) {
  try {
    const rawParams = context?.params;
    const resolvedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const lessonId = resolvedParams?.lessonId;

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson id is required.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const lessonRecord = await fetchLessonRecord(supabase, lessonId);
    if (!lessonRecord) {
      return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });
    }

    const presenterLinks = await fetchPresenterLinks(supabase, lessonId);
    const presenterIdValues = presenterLinks.map((row) => row?.presenter_id);
    const sanitizedPresenterIds = sanitizePresenterIds(presenterIdValues);
    const orderMap = new Map(sanitizedPresenterIds.map((value, index) => [value, index]));
    const presenters = await loadPresentersByIds(supabase, sanitizedPresenterIds, orderMap);

    const tags = await fetchTags(supabase, lessonId);
    const lesson = normalizeLessonRow(lessonRecord, presenters, tags);

    return NextResponse.json({
      lesson: {
        ...lesson,
        presenterIds: sanitizedPresenterIds,
        tags,
      },
    });
  } catch (error) {
    console.error('[api/admin/lessons] Failed to load lesson for admin', error);
    return NextResponse.json({ error: 'Unable to load lesson.' }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const rawParams = context?.params;
    const resolvedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const lessonId = resolvedParams?.lessonId;

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson id is required.' }, { status: 400 });
    }

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
      tags = [],
    } = body ?? {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    const sanitizedPresenterIds = sanitizePresenterIds(presenterIds);
    const sanitizedTags = sanitizeTags(tags);
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('lessons')
      .update({
        title: title.trim(),
        module_id: moduleId || null,
        format: format || null,
        duration: duration || null,
        image_url: imageUrl || null,
        url: externalUrl || null,
        is_enhanced_only: Boolean(isEnhancedOnly),
      })
      .eq('id', lessonId)
      .select(SELECT_COLUMNS.join(', '))
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });
    }

    try {
      const { error: deleteLinkError } = await supabase.from('lesson_presenters').delete().eq('lesson_id', lessonId);
      if (deleteLinkError) throw deleteLinkError;

      if (sanitizedPresenterIds.length > 0) {
        const presenterLinkRows = sanitizedPresenterIds.map((presenterId) => {
          const numericId = Number(presenterId);
          const value = Number.isFinite(numericId) ? numericId : presenterId;
          return {
            lesson_id: lessonId,
            presenter_id: value,
          };
        });

        const { error: insertError } = await supabase.from('lesson_presenters').insert(presenterLinkRows);
        if (insertError) throw insertError;
      }
    } catch (linkError) {
      console.error('[api/admin/lessons] Failed to update lesson presenters', linkError);
      throw linkError;
    }

    try {
      const { error: deleteTagsError } = await supabase.from('lesson_tags').delete().eq('lesson_id', lessonId);
      if (deleteTagsError) throw deleteTagsError;

      if (sanitizedTags.length > 0) {
        const tagRows = sanitizedTags.map((tag) => ({
          lesson_id: lessonId,
          tag,
        }));

        const { error: insertTagsError } = await supabase.from('lesson_tags').insert(tagRows);
        if (insertTagsError) throw insertTagsError;
      }
    } catch (tagError) {
      console.error('[api/admin/lessons] Failed to update lesson tags', tagError);
      throw tagError;
    }

    let presenters = [];
    if (sanitizedPresenterIds.length > 0) {
      try {
        const { data: presenterRows, error: presenterFetchError } = await supabase
          .from('presenters')
          .select('*')
          .in('id', sanitizedPresenterIds);

        if (presenterFetchError) throw presenterFetchError;

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
        console.error('[api/admin/lessons] Failed to fetch presenters after lesson update', presenterFetchError);
      }
    }

    const lesson = normalizeLessonRow(data, presenters, sanitizedTags);

    return NextResponse.json({
      lesson: {
        ...lesson,
        presenterIds: sanitizedPresenterIds,
        tags: sanitizedTags,
      },
    });
  } catch (error) {
    console.error('[api/admin/lessons] Failed to update lesson', error);
    return NextResponse.json({ error: 'Unable to update lesson.' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const rawParams = context?.params;
    const resolvedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const lessonId = resolvedParams?.lessonId;

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson id is required.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    try {
      await supabase.from('lesson_presenters').delete().eq('lesson_id', lessonId);
      await supabase.from('lesson_tags').delete().eq('lesson_id', lessonId);
    } catch (cleanupError) {
      console.error('[api/admin/lessons] Failed to cleanup lesson relations before delete', cleanupError);
    }

    const { data, error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId)
      .select('id')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[api/admin/lessons] Failed to delete lesson', error);
    return NextResponse.json({ error: 'Unable to delete lesson.' }, { status: 500 });
  }
}
