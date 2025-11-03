import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

const ADMIN_ROLES = new Set(['admin', 'enhanced']);
const VALID_MODULE_TYPES = new Set(['core', 'bitesize']);

export async function GET(request) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const rawRole = searchParams.get('role') ?? 'normal';
		const role = rawRole.toLowerCase();
		const requestedModuleType = searchParams.get('moduleType');
		const normalizedModuleType = requestedModuleType ? requestedModuleType.toLowerCase() : null;
		const shouldFilterByModuleType = normalizedModuleType && VALID_MODULE_TYPES.has(normalizedModuleType);

		const favouritesFor = searchParams.get('favouritesFor');
		const shouldFilterByFavourites = Boolean(favouritesFor);
		const progressFor = searchParams.get('progressFor');
		const shouldIncludeProgress = Boolean(progressFor);

		const supabase = createSupabaseServiceClient();

		const baseColumns = [
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
		].join(', ');

		const selectColumns = [baseColumns];
		if (shouldFilterByModuleType) {
			selectColumns.push('modules!inner(id, title, type, sequence)');
		} else {
			selectColumns.push('modules(id, title, type, sequence)');
		}

		if (shouldFilterByFavourites) {
			selectColumns.push('favourites!inner(user_id)');
		}

		let query = supabase
			.from('lessons')
			.select(selectColumns.join(', '))
			.order('sequence', { ascending: true })
			.order('title', { ascending: true });

		if (!ADMIN_ROLES.has(role)) {
			query = query.or('is_enhanced_only.is.null,is_enhanced_only.eq.false');
		}

		if (shouldFilterByModuleType) {
			query = query.eq('modules.type', normalizedModuleType);
		}

		if (shouldFilterByFavourites) {
			query = query.eq('favourites.user_id', favouritesFor);
		}

		const { data, error } = await query;

		if (error) {
			throw error;
		}

		const lessons = Array.isArray(data) ? data : [];
		const lessonIds = lessons.map((lesson) => lesson.id).filter(Boolean);

		let tagMap = new Map();
		let progressMap = new Map();

		if (lessonIds.length > 0) {
			const { data: tagRows, error: tagError } = await supabase
				.from('lesson_tags')
				.select('lesson_id, tag')
				.in('lesson_id', lessonIds)
				.order('lesson_id', { ascending: true })
				.order('tag', { ascending: true });

			if (tagError) {
				throw tagError;
			}

			if (Array.isArray(tagRows)) {
				tagMap = tagRows.reduce((acc, row) => {
					if (!row?.lesson_id || !row?.tag) return acc;
					const existing = acc.get(row.lesson_id) ?? [];
					if (existing.length < 3) {
						existing.push(row.tag);
						acc.set(row.lesson_id, existing);
					}
					return acc;
				}, new Map());
			}

			if (shouldIncludeProgress) {
				const { data: progressRows, error: progressError } = await supabase
					.from('lesson_progress')
					.select('lesson_id, status, progress_percent, completed_at, updated_at, started_at')
					.eq('user_id', progressFor)
					.in('lesson_id', lessonIds);

				if (progressError) {
					throw progressError;
				}

				if (Array.isArray(progressRows)) {
					progressMap = progressRows.reduce((acc, row) => {
						if (!row?.lesson_id) return acc;
						acc.set(row.lesson_id, {
							status: row.status,
							progressPercent: row.progress_percent,
							completedAt: row.completed_at,
							updatedAt: row.updated_at,
							startedAt: row.started_at,
						});
						return acc;
					}, new Map());
				}
			}
		}

		const enrichedLessons = lessons.map((lesson) => {
			const { modules, favourites, ...rest } = lesson;
			let moduleRecord = null;
			if (Array.isArray(modules)) {
				moduleRecord = modules[0] ?? null;
			} else if (modules && typeof modules === 'object') {
				moduleRecord = modules;
			}

			const isFavourite = shouldFilterByFavourites
				? true
				: Array.isArray(favourites)
					? favourites.some((item) => item?.user_id)
					: Boolean(favourites);

			return {
				...rest,
				module: moduleRecord,
				tags: tagMap.get(lesson.id) ?? [],
				is_favourite: isFavourite,
				progress: progressMap.get(lesson.id) ?? null,
			};
		});

		return NextResponse.json({ lessons: enrichedLessons });
	} catch (error) {
		console.error('[api/lessons] Failed to fetch lessons', error);
		return NextResponse.json({ error: 'Unable to fetch lessons.' }, { status: 500 });
	}
}
