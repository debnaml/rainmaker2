import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

const SELECT_COLUMNS = [
  'id',
  'email',
  'display_name',
  'role',
  'peer_group_id',
  'avatar_url',
  'created_at',
  'updated_at',
];

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const missingPeerGroup = searchParams.get('missingPeerGroup') === 'true';
    const searchTerm = searchParams.get('search')?.trim() ?? '';
    const roleFilter = searchParams.get('role')?.trim().toLowerCase() ?? 'all';
    const assignmentFilter = searchParams.get('assignment')?.trim().toLowerCase() ?? 'all';
    const pageParam = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSizeParam = parseInt(searchParams.get('pageSize') ?? '20', 10);

    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const rawPageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0 ? pageSizeParam : 20;
    const pageSize = Math.min(rawPageSize, 100);
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    const supabase = createSupabaseServiceClient();
    let query = supabase
      .from('users')
      .select(SELECT_COLUMNS.join(', '), { count: 'exact' })
      .order('created_at', { ascending: false });

    if (missingPeerGroup) {
      query = query.is('peer_group_id', null);
    } else {
      if (roleFilter && roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      if (assignmentFilter === 'assigned') {
        query = query.not('peer_group_id', 'is', null);
      } else if (assignmentFilter === 'unassigned') {
        query = query.is('peer_group_id', null);
      }
    }

    if (searchTerm) {
      const likeStatement = `%${searchTerm}%`;
      query = query.or(`display_name.ilike.${likeStatement},email.ilike.${likeStatement}`);
    }

    const { data, error, count } = await query.range(fromIndex, toIndex);

    if (error) {
      throw error;
    }

    const users = Array.isArray(data) ? data : [];

    const peerGroupIds = Array.from(
      new Set(users.map((item) => item.peer_group_id).filter(Boolean))
    );

    let peerGroupMap = null;

    if (peerGroupIds.length) {
      // Load peer group metadata separately to avoid relying on a configured FK relationship in Supabase.
      const { data: peerGroups, error: peerGroupsError } = await supabase
        .from('peer_groups')
        .select('id, title')
        .in('id', peerGroupIds);

      if (peerGroupsError) {
        console.error('[api/admin/users] Failed to fetch peer groups', peerGroupsError);
      } else if (Array.isArray(peerGroups)) {
        peerGroupMap = new Map(
          peerGroups.map((group) => [group.id, { id: group.id, name: group.title ?? null }])
        );
      }
    }

    const enrichedUsers = peerGroupMap
      ? users.map((item) => ({
          ...item,
          peer_groups: item.peer_group_id ? peerGroupMap.get(item.peer_group_id) ?? null : null,
        }))
      : users.map((item) => ({ ...item, peer_groups: null }));

    const total = typeof count === 'number' ? count : users.length;

    return NextResponse.json({
      users: enrichedUsers,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[api/admin/users] Failed to fetch users', error);
    return NextResponse.json({ error: 'Unable to fetch users.' }, { status: 500 });
  }
}
