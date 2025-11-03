import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

export async function POST(request, { params }) {
  const { lessonId } = (await params) ?? {};

  if (!lessonId) {
    return NextResponse.json({ error: 'Lesson id is required.' }, { status: 400 });
  }

  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from('favourites')
      .upsert({ user_id: userId, lesson_id: lessonId }, { onConflict: 'user_id,lesson_id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/lessons/[lessonId]/favourite] Failed to save favourite', error);
    return NextResponse.json({ error: 'Unable to save favourite.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { lessonId } = (await params) ?? {};

  if (!lessonId) {
    return NextResponse.json({ error: 'Lesson id is required.' }, { status: 400 });
  }

  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from('favourites')
      .delete()
      .eq('user_id', userId)
      .eq('lesson_id', lessonId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/lessons/[lessonId]/favourite] Failed to remove favourite', error);
    return NextResponse.json({ error: 'Unable to remove favourite.' }, { status: 500 });
  }
}
