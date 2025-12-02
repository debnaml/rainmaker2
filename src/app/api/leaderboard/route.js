import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

function normalizePercent(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.min(100, value));
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
}

function deriveDisplayName(user) {
  if (!user) return 'Unknown';
  const name = user.display_name ?? user.displayName ?? '';
  if (typeof name === 'string' && name.trim().length > 0) {
    return name.trim();
  }
  if (typeof user.email === 'string') {
    return user.email.split('@')[0];
  }
  return 'Unknown';
}

function aggregateProgress(rows = []) {
  const progressByUser = new Map();
  let latestUpdatedAt = null;

  rows.forEach((row) => {
    const userId = row.user_id;
    const lessonId = row.lesson_id;
    if (!userId || !lessonId) return;

    const percent = normalizePercent(row.progress_percent);
    let userMap = progressByUser.get(userId);
    if (!userMap) {
      userMap = new Map();
      progressByUser.set(userId, userMap);
    }
    userMap.set(lessonId, percent);

    const updatedAt = row.updated_at ? new Date(row.updated_at) : null;
    if (updatedAt && !Number.isNaN(updatedAt.valueOf())) {
      if (!latestUpdatedAt || updatedAt > latestUpdatedAt) {
        latestUpdatedAt = updatedAt;
      }
    }
  });

  return {
    progressByUser,
    latestUpdatedAt,
  };
}

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, display_name, email, peer_group_id')
      .eq('id', userId)
      .maybeSingle();

    if (userError) throw userError;

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (!userRecord.peer_group_id) {
      return NextResponse.json({ peerGroup: null, entries: [], lastUpdated: null });
    }

    const { data: group, error: groupError } = await supabase
      .from('peer_groups')
      .select('id, title')
      .eq('id', userRecord.peer_group_id)
      .maybeSingle();

    if (groupError) throw groupError;

    if (!group) {
      return NextResponse.json({ peerGroup: null, entries: [], lastUpdated: null });
    }

    const { data: members, error: membersError } = await supabase
      .from('users')
      .select('id, display_name, email, role')
      .eq('peer_group_id', group.id);

    if (membersError) throw membersError;

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ peerGroup: { id: group.id, name: group.title }, entries: [], lastUpdated: null });
    }

    const memberIds = members.map((member) => member.id);

    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, is_enhanced_only');

    if (lessonsError) throw lessonsError;

    const standardLessons = (lessons ?? []).filter((lesson) => !lesson.is_enhanced_only);
    const standardLessonIds = standardLessons.map((lesson) => lesson.id);
    const allLessonIds = (lessons ?? []).map((lesson) => lesson.id);

    const countStandard = standardLessonIds.length;
    const countAll = allLessonIds.length;

    let progressQuery = supabase
      .from('lesson_progress')
      .select('user_id, lesson_id, progress_percent, updated_at')
      .in('user_id', memberIds);

    if (allLessonIds.length > 0) {
      progressQuery = progressQuery.in('lesson_id', allLessonIds);
    }

    const { data: progressRows, error: progressError } = await progressQuery;

    if (progressError) throw progressError;

    const { progressByUser, latestUpdatedAt } = aggregateProgress(progressRows ?? []);

    const computeAverage = (member) => {
      const role = (member.role ?? 'normal').toLowerCase();
      const eligibleLessons = role === 'admin' || role === 'enhanced' ? allLessonIds : standardLessonIds;
      const totalLessons = eligibleLessons.length;

      if (totalLessons === 0) {
        return 0;
      }

      const userProgress = progressByUser.get(member.id) ?? new Map();
      const sum = eligibleLessons.reduce((acc, lessonId) => acc + (userProgress.get(lessonId) ?? 0), 0);

      return sum / totalLessons;
    };

    const entries = members
      .map((member) => ({
        id: member.id,
        name: deriveDisplayName(member),
        percent: computeAverage(member),
      }))
      .sort((a, b) => b.percent - a.percent)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        movement: 0,
      }));

    return NextResponse.json({
      peerGroup: {
        id: group.id,
        name: group.title,
      },
      entries,
      lastUpdated: latestUpdatedAt ? latestUpdatedAt.toISOString() : null,
    });
  } catch (error) {
    console.error('[api/leaderboard] Failed to fetch leaderboard', error);
    return NextResponse.json({ error: 'Unable to load leaderboard.' }, { status: 500 });
  }
}
