import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

const ADMIN_ROLES = new Set(['admin', 'enhanced']);

export async function GET(request) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const rawRole = searchParams.get('role') ?? 'normal';
		const role = rawRole.toLowerCase();

		const supabase = createSupabaseServiceClient();

		let query = supabase
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
				].join(', ')
			)
			.order('sequence', { ascending: true })
			.order('title', { ascending: true });

		if (!ADMIN_ROLES.has(role)) {
			query = query.or('is_enhanced_only.is.null,is_enhanced_only.eq.false');
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

		const enrichedLessons = lessons.map((lesson) => ({
			...lesson,
			tags: tagMap.get(lesson.id) ?? [],
		}));

		return NextResponse.json({ lessons: enrichedLessons });
	} catch (error) {
		console.error('[api/lessons] Failed to fetch lessons', error);
		return NextResponse.json({ error: 'Unable to fetch lessons.' }, { status: 500 });
	}
}
