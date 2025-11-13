import { NextResponse } from 'next/server';
import { derivePresenterDisplayName } from '/lib/presenters';
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
		let presenterMap = new Map();

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

			let pivotList = [];
			try {
				const { data: lessonPresenterRows } = await supabase
					.from('lesson_presenters')
					.select('lesson_id, presenter_id')
					.in('lesson_id', lessonIds);

				pivotList = Array.isArray(lessonPresenterRows) ? lessonPresenterRows : [];
			} catch (presenterPivotError) {
				console.error('[api/lessons] Failed to load presenter links', presenterPivotError);
			}

			if (pivotList.length > 0) {
				const presenterIds = Array.from(
					new Set(
						pivotList
							.map((row) => {
								const value = row?.presenter_id;
								if (value === null || value === undefined) return null;
								if (typeof value === 'string') {
									const trimmed = value.trim();
									return trimmed.length > 0 ? trimmed : null;
								}
								if (typeof value === 'number' && Number.isFinite(value)) {
									return value;
								}
								return null;
							})
							.filter((value) => value !== null)
					)
				);

				if (presenterIds.length > 0) {
					try {
						const { data: presenterRows } = await supabase
							.from('presenters')
							.select('*')
							.in('id', presenterIds);

						const presenterLookup = new Map(
							(Array.isArray(presenterRows) ? presenterRows : [])
								.map((record) => {
									const displayName = derivePresenterDisplayName(record);
									if (!record?.id || !displayName) return null;
									return [String(record.id), { id: record.id, name: displayName }];
								})
								.filter(Boolean)
						);

						presenterMap = pivotList.reduce((acc, row) => {
							const lessonId = row?.lesson_id;
							if (!lessonId) return acc;
							const presenterId = row?.presenter_id;
							const key = presenterId !== null && presenterId !== undefined ? String(presenterId) : null;
							if (!key || !presenterLookup.has(key)) return acc;
							const existing = acc.get(lessonId) ?? [];
							if (!existing.some((item) => String(item.id) === key)) {
								existing.push(presenterLookup.get(key));
							}
							acc.set(lessonId, existing);
							return acc;
						}, new Map());
					} catch (presenterFetchError) {
						console.error('[api/lessons] Failed to load presenter records', presenterFetchError);
					}
				}
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

			const presenterList = presenterMap.get(lesson.id) ?? [];
			const sortedPresenters = presenterList.length
				? [...presenterList].sort((a, b) => {
					const nameA = typeof a?.name === 'string' ? a.name : '';
					const nameB = typeof b?.name === 'string' ? b.name : '';
					return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
				})
				: presenterList;

			const isFavourite = shouldFilterByFavourites
				? true
				: Array.isArray(favourites)
					? favourites.some((item) => item?.user_id)
					: Boolean(favourites);

			return {
				...rest,
				module: moduleRecord,
				tags: tagMap.get(lesson.id) ?? [],
				presenters: sortedPresenters,
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



