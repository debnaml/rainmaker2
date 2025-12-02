import { NextResponse } from 'next/server';
import { normalizePeerGroup, sanitizePeerGroupPayload } from '/lib/peerGroups';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

const SELECT_COLUMNS = ['id', 'title', 'created_at'];

async function resolvePeerGroupId(context) {
  const rawParams = context?.params;
  const resolved = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
  const peerGroupId = resolved?.peerGroupId;
  if (!peerGroupId) {
    throw new Error('Peer group id is required.');
  }
  return peerGroupId;
}

export async function PATCH(request, context) {
  try {
    let peerGroupId;
    try {
      peerGroupId = await resolvePeerGroupId(context);
    } catch (paramError) {
      return NextResponse.json({ error: paramError.message }, { status: 400 });
    }

    const body = await request.json();
    const { payload, errors } = sanitizePeerGroupPayload(body);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const updates = {
      title: payload.name,
    };

    const { data, error } = await supabase
      .from('peer_groups')
      .update(updates)
      .eq('id', peerGroupId)
      .select(SELECT_COLUMNS.join(', '))
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Peer group not found.' }, { status: 404 });
    }

    const peerGroup = normalizePeerGroup(data);

    if (!peerGroup) {
      return NextResponse.json({ error: 'Peer group not found.' }, { status: 404 });
    }

    return NextResponse.json({ peerGroup });
  } catch (error) {
    console.error('[api/admin/peer-groups] Failed to update peer group', error);
    return NextResponse.json({ error: 'Unable to update peer group.' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    let peerGroupId;
    try {
      peerGroupId = await resolvePeerGroupId(context);
    } catch (paramError) {
      return NextResponse.json({ error: paramError.message }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('peer_groups')
      .delete()
      .eq('id', peerGroupId)
      .select('id')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Peer group not found.' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[api/admin/peer-groups] Failed to delete peer group', error);
    return NextResponse.json({ error: 'Unable to delete peer group.' }, { status: 500 });
  }
}
