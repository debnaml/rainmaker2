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

		const moduleColumns = shouldFilterByModuleType
			? 'modules!inner(id, title, type, sequence)'
			: 'modules(id, title, type, sequence)';

		let query = supabase
			.from('lessons')
			.select(`${baseColumns}, ${moduleColumns}`)
			.order('sequence', { ascending: true })
			.order('title', { ascending: true });

		if (!ADMIN_ROLES.has(role)) {
			query = query.or('is_enhanced_only.is.null,is_enhanced_only.eq.false');
		}

		if (shouldFilterByModuleType) {
			query = query.eq('modules.type', normalizedModuleType);
		}

		const { data, error } = await query;

		if (error) {
			throw error;
		}

		const lessons = Array.isArray(data) ? data : [];
		const lessonIds = lessons.map((lesson) => lesson.id).filter(Boolean);

		let tagMap = new Map();

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
		}

		const enrichedLessons = lessons.map((lesson) => {
			const { modules, ...rest } = lesson;
			let moduleRecord = null;
			if (Array.isArray(modules)) {
				moduleRecord = modules[0] ?? null;
			} else if (modules && typeof modules === 'object') {
				moduleRecord = modules;
			}

			return {
				...rest,
				module: moduleRecord,
				tags: tagMap.get(lesson.id) ?? [],
			};
		});

		return NextResponse.json({ lessons: enrichedLessons });
	} catch (error) {
		console.error('[api/lessons] Failed to fetch lessons', error);
		return NextResponse.json({ error: 'Unable to fetch lessons.' }, { status: 500 });
	}
}
