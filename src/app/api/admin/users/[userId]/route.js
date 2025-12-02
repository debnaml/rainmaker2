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
];

function normalizePeerGroupId(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeRole(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (!['admin', 'enhanced', 'normal'].includes(trimmed)) {
    return null;
  }
  return trimmed;
}

async function resolveUserId(context) {
  const rawParams = context?.params;
  const resolved = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
  const userId = resolved?.userId;
  if (!userId) {
    throw new Error('User id is required.');
  }
  return userId;
}

export async function PATCH(request, context) {
  try {
    let userId;
    try {
      userId = await resolveUserId(context);
    } catch (paramError) {
      return NextResponse.json({ error: paramError.message }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));

    const nextPeerGroupId = normalizePeerGroupId(body.peerGroupId ?? body.peer_group_id);
    const shouldUpdatePeerGroup =
      Object.prototype.hasOwnProperty.call(body, 'peerGroupId') ||
      Object.prototype.hasOwnProperty.call(body, 'peer_group_id');

    const nextRole = normalizeRole(body.role ?? body.userRole);
    const shouldUpdateRole = Object.prototype.hasOwnProperty.call(body, 'role') ||
      Object.prototype.hasOwnProperty.call(body, 'userRole');

    const updates = {};

    if (shouldUpdatePeerGroup) {
      updates.peer_group_id = nextPeerGroupId;
    }

    if (shouldUpdateRole) {
      if (!nextRole) {
        return NextResponse.json({ error: 'Role is invalid.' }, { status: 400 });
      }
      updates.role = nextRole;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    if (shouldUpdatePeerGroup && nextPeerGroupId) {
      const { data: peerGroup, error: peerGroupError } = await supabase
        .from('peer_groups')
        .select('id')
        .eq('id', nextPeerGroupId)
        .maybeSingle();

      if (peerGroupError) {
        throw peerGroupError;
      }

      if (!peerGroup) {
        return NextResponse.json({ error: 'Peer group not found.' }, { status: 404 });
      }
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select(SELECT_COLUMNS.join(', '))
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error('[api/admin/users] Failed to update user', error);
    return NextResponse.json({ error: 'Unable to update user.' }, { status: 500 });
  }
}
