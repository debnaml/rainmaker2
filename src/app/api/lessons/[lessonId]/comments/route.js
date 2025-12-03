import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

const MAX_COMMENT_LENGTH = 2000;

function deriveDisplayName(user) {
  if (!user) return 'Anonymous';
  const fromDisplayName = user.display_name ?? user.displayName ?? user.name;
  if (typeof fromDisplayName === 'string' && fromDisplayName.trim().length > 0) {
    return fromDisplayName.trim();
  }
  if (typeof user.email === 'string' && user.email.includes('@')) {
    return user.email.split('@')[0];
  }
  return 'Anonymous';
}

function normalizeComment(record) {
  if (!record) return null;
  const author = record.user ?? record.author ?? null;
  return {
    id: record.id ?? null,
    lessonId: record.lesson_id ?? null,
    userId: record.user_id ?? author?.id ?? null,
    content: typeof record.content === 'string' ? record.content : '',
    createdAt: record.created_at ?? null,
    author: author
      ? {
          id: author.id ?? null,
          name: deriveDisplayName(author),
          email: author.email ?? null,
        }
      : {
          id: record.user_id ?? null,
          name: 'Anonymous',
          email: null,
        },
  };
}

export async function GET(request, { params }) {
  const { lessonId } = (await params) ?? {};

  if (!lessonId) {
    return NextResponse.json({ error: 'Lesson id is required.' }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('comments')
      .select('id, lesson_id, user_id, content, created_at, user:users(id, display_name, email)')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const comments = (data ?? []).map(normalizeComment).filter(Boolean);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('[api/lessons/[lessonId]/comments] Failed to fetch comments', error);
    return NextResponse.json({ error: 'Unable to load comments.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { lessonId } = (await params) ?? {};

  if (!lessonId) {
    return NextResponse.json({ error: 'Lesson id is required.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const userId = body?.userId;
    const content = typeof body?.content === 'string' ? body.content : '';
    const trimmed = content.trim();

    if (!userId) {
      return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
    }

    if (!trimmed) {
      return NextResponse.json({ error: 'Comment content is required.' }, { status: 400 });
    }

    if (trimmed.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json({ error: `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.` }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('comments')
      .insert({
        id: randomUUID(),
        lesson_id: lessonId,
        user_id: userId,
        content: trimmed,
      })
      .select('id, lesson_id, user_id, content, created_at, user:users(id, display_name, email)')
      .maybeSingle();

    if (error) throw error;

    const comment = normalizeComment(data);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    if (error?.name === 'SyntaxError') {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    console.error('[api/lessons/[lessonId]/comments] Failed to create comment', error);
    return NextResponse.json({ error: 'Unable to post comment.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { lessonId } = (await params) ?? {};

  if (!lessonId) {
    return NextResponse.json({ error: 'Lesson id is required.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const commentId = body?.commentId;
    const userId = body?.userId;

    if (!commentId) {
      return NextResponse.json({ error: 'Comment id is required.' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const { data: existing, error: fetchError } = await supabase
      .from('comments')
      .select('id, lesson_id, user_id')
      .eq('id', commentId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existing || String(existing.lesson_id) !== String(lessonId)) {
      return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });
    }

    if (existing.user_id !== userId) {
      return NextResponse.json({ error: 'You can only delete your own comments.' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error?.name === 'SyntaxError') {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    console.error('[api/lessons/[lessonId]/comments] Failed to delete comment', error);
    return NextResponse.json({ error: 'Unable to delete comment.' }, { status: 500 });
  }
}
