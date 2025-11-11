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

    const supabase = createSupabaseServiceClient();
    let query = supabase
      .from('users')
      .select(SELECT_COLUMNS.join(', '))
      .order('created_at', { ascending: false });

    if (missingPeerGroup) {
      query = query.is('peer_group_id', null);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ users: Array.isArray(data) ? data : [] });
  } catch (error) {
    console.error('[api/admin/users] Failed to fetch users', error);
    return NextResponse.json({ error: 'Unable to fetch users.' }, { status: 500 });
  }
}
