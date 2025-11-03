import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

const VALID_STATUSES = new Set(['not_started', 'in_progress', 'completed', 'skipped']);

export async function PUT(request, { params }) {
  const { lessonId } = (await params) ?? {};

  if (!lessonId) {
    return NextResponse.json({ error: 'Lesson id is required.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const {
      userId,
      status,
      progressPercent = null,
      metadata = null,
      source = null,
      completedAt = null,
    } = body ?? {};

    if (!userId) {
      return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
    }

    if (status && !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid status value.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const { data: existing, error: existingError } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (existingError) throw existingError;

    const nextStatus = status ?? existing?.status ?? 'not_started';
    const nextProgressPercent = progressPercent ?? existing?.progress_percent ?? null;

    const payload = {
      user_id: userId,
      lesson_id: lessonId,
      status: nextStatus,
      progress_percent: nextProgressPercent,
      metadata,
      source,
    };

    if (existing?.started_at) {
      payload.started_at = existing.started_at;
    } else if (nextStatus !== 'not_started') {
      payload.started_at = new Date().toISOString();
    }

    if (nextStatus === 'completed') {
      payload.completed_at = completedAt ?? existing?.completed_at ?? new Date().toISOString();
    } else if (nextStatus === 'not_started') {
      payload.completed_at = null;
      payload.progress_percent = 0;
    } else {
      payload.completed_at = completedAt ?? existing?.completed_at ?? null;
    }

    const { data, error: upsertError } = await supabase
      .from('lesson_progress')
      .upsert(payload, { onConflict: 'user_id,lesson_id' })
      .select('user_id, lesson_id, status, progress_percent, started_at, completed_at, updated_at, metadata')
      .maybeSingle();

    if (upsertError) throw upsertError;

    return NextResponse.json({ progress: data });
  } catch (error) {
    console.error('[api/lessons/[lessonId]/progress] Failed to update progress', error);
    return NextResponse.json({ error: 'Unable to update progress.' }, { status: 500 });
  }
}
