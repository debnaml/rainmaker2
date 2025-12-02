import { NextResponse } from 'next/server';
import { derivePresenterDisplayName } from '/lib/presenters';
import { normalizeResourceRecord, sortResources } from '/lib/resources/normalizers';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

const ADMIN_ROLES = new Set(['admin', 'enhanced']);

export async function GET(request, { params }) {
  const { lessonId } = (await params) ?? {};

  if (!lessonId) {
    return NextResponse.json({ error: 'Lesson id is required.' }, { status: 400 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') ?? null;
  const roleParam = url.searchParams.get('role') ?? 'normal';
  const role = roleParam.toLowerCase();

  try {
    const supabase = createSupabaseServiceClient();

    const lessonQuery = supabase
      .from('lessons')
      .select(
        [
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
          'modules:module_id(id, title, type, sequence)',
        ].join(', ')
      )
      .eq('id', lessonId)
      .maybeSingle();

    if (!ADMIN_ROLES.has(role)) {
      lessonQuery.or('is_enhanced_only.is.null,is_enhanced_only.eq.false');
    }

    const { data: lesson, error: lessonError } = await lessonQuery;

    if (lessonError) throw lessonError;
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });
    }

    let isFavourite = false;
    let progress = null;

    if (userId) {
      const [{ data: favouriteData, error: favouriteError }, { data: progressData, error: progressError }] = await Promise.all([
        supabase
          .from('favourites')
          .select('user_id')
          .eq('user_id', userId)
          .eq('lesson_id', lessonId)
          .maybeSingle(),
        supabase
          .from('lesson_progress')
          .select(
            'user_id, lesson_id, status, progress_percent, started_at, completed_at, updated_at, metadata'
          )
          .eq('user_id', userId)
          .eq('lesson_id', lessonId)
          .maybeSingle(),
      ]);

      if (favouriteError) throw favouriteError;
      if (progressError) throw progressError;

      isFavourite = Boolean(favouriteData);
      progress = progressData;
    }

    const moduleLessons = [];
    if (lesson.module_id) {
      const { data: moduleLessonRows, error: moduleLessonsError } = await supabase
        .from('lessons')
        .select('id, title, sequence, is_enhanced_only')
        .eq('module_id', lesson.module_id)
        .order('sequence', { ascending: true })
        .order('title', { ascending: true });

      if (moduleLessonsError) throw moduleLessonsError;

      let progressMap = new Map();
      if (userId && Array.isArray(moduleLessonRows) && moduleLessonRows.length > 0) {
        const lessonIds = moduleLessonRows.map((row) => row.id);
        const { data: progressRows, error: moduleProgressError } = await supabase
          .from('lesson_progress')
          .select('lesson_id, status, progress_percent, completed_at')
          .eq('user_id', userId)
          .in('lesson_id', lessonIds);

        if (moduleProgressError) throw moduleProgressError;
        if (Array.isArray(progressRows)) {
          progressMap = progressRows.reduce((acc, row) => acc.set(row.lesson_id, row), new Map());
        }
      }

      moduleLessonRows.forEach((row) => {
        const progressRow = progressMap.get(row.id);
        moduleLessons.push({
          id: row.id,
          title: row.title,
          sequence: row.sequence,
          isEnhancedOnly: Boolean(row.is_enhanced_only),
          progress: progressRow
            ? {
                status: progressRow.status,
                progressPercent: progressRow.progress_percent,
                completedAt: progressRow.completed_at,
              }
            : null,
        });
      });
    }

    const moduleInfo = Array.isArray(lesson.modules)
      ? lesson.modules[0] ?? null
      : lesson.modules ?? null;

    let resources = [];
    try {
      const { data: resourceRows, error: resourceError } = await supabase
        .from('downloads')
        .select(
          'id, lesson_id, title, resource_type, file_url, external_url, storage_path, mime_type, file_size, sequence, created_at, updated_at'
        )
        .eq('lesson_id', lesson.id)
        .order('sequence', { ascending: true, nullsFirst: true })
        .order('title', { ascending: true });

      if (resourceError) throw resourceError;

      resources = Array.isArray(resourceRows)
        ? sortResources(resourceRows.map((row) => normalizeResourceRecord(row)).filter(Boolean))
        : [];
    } catch (resourceError) {
      console.error('[api/lessons/[lessonId]] Failed to load lesson resources', resourceError);
      resources = [];
    }

    let presenters = [];
    try {
      const { data: presenterLinkRows, error: presenterLinkError } = await supabase
        .from('lesson_presenters')
        .select('presenter_id, presenters:presenter_id(*)')
        .eq('lesson_id', lesson.id);

      if (presenterLinkError) throw presenterLinkError;

      const seen = new Set();
      presenters = (Array.isArray(presenterLinkRows) ? presenterLinkRows : [])
        .map((row) => row?.presenters ?? null)
        .map((record) => {
          const displayName = derivePresenterDisplayName(record);
          if (!record?.id || !displayName) return null;
          const key = String(record.id);
          if (seen.has(key)) return null;
          seen.add(key);
          return { id: record.id, name: displayName };
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    } catch (presenterError) {
      console.error('[api/lessons/[lessonId]] Failed to load lesson presenters', presenterError);
      presenters = [];
    }

    const responsePayload = {
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        imageUrl: lesson.image_url,
        format: lesson.format,
        duration: lesson.duration,
        url: lesson.url,
        sequence: lesson.sequence,
        isEnhancedOnly: Boolean(lesson.is_enhanced_only),
        createdAt: lesson.created_at,
        module: moduleInfo
          ? {
              id: moduleInfo.id,
              title: moduleInfo.title,
              type: moduleInfo.type,
              sequence: moduleInfo.sequence,
            }
          : null,
        presenters,
        primaryContent: {
          type: lesson.format,
          url: lesson.url,
          imageUrl: lesson.image_url,
        },
        resources,
      },
      progress: progress
        ? {
            status: progress.status,
            progressPercent: progress.progress_percent,
            startedAt: progress.started_at,
            completedAt: progress.completed_at,
            updatedAt: progress.updated_at,
            metadata: progress.metadata,
          }
        : null,
      favourite: isFavourite,
      moduleLessons,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('[api/lessons/[lessonId]] Failed to load lesson detail', error);
    return NextResponse.json({ error: 'Unable to fetch lesson detail.' }, { status: 500 });
  }
}
