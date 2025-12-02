import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { normalizePeerGroup, sanitizePeerGroupPayload } from '/lib/peerGroups';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

const SELECT_COLUMNS = ['id', 'title', 'created_at'];

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('peer_groups')
      .select(SELECT_COLUMNS.join(', '))
      .order('title', { ascending: true, nullsLast: true })
      .order('id', { ascending: true });

    if (error) throw error;

    const peerGroups = Array.isArray(data)
      ? data
          .map(normalizePeerGroup)
          .filter((record) => record && record.id && record.name)
      : [];

    return NextResponse.json({ peerGroups });
  } catch (error) {
    console.error('[api/admin/peer-groups] Failed to load peer groups', error);
    return NextResponse.json({ error: 'Unable to load peer groups.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { payload, errors } = sanitizePeerGroupPayload(body);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const insertPayload = {
      id: randomUUID(),
      title: payload.name,
    };

    const { data, error } = await supabase
      .from('peer_groups')
      .insert(insertPayload)
      .select(SELECT_COLUMNS.join(', '))
      .single();

    if (error) throw error;

    const peerGroup = normalizePeerGroup(data);

    if (!peerGroup) {
      return NextResponse.json({ error: 'Unable to create peer group.' }, { status: 500 });
    }

    return NextResponse.json({ peerGroup }, { status: 201 });
  } catch (error) {
    console.error('[api/admin/peer-groups] Failed to create peer group', error);
    return NextResponse.json({ error: 'Unable to create peer group.' }, { status: 500 });
  }
}
