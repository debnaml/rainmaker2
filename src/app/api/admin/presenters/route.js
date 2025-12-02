import { NextResponse } from 'next/server';
import { normalizePresenter, sanitizePresenterPayload } from '/lib/presenters';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

const SELECT_COLUMNS = '*';

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('presenters')
      .select(SELECT_COLUMNS)
      .order('name', { ascending: true, nullsLast: true })
      .order('id', { ascending: true });

    if (error) throw error;

    const presenters = Array.isArray(data)
      ? data
          .map(normalizePresenter)
          .filter((record) => record && record.id && record.name)
      : [];

    presenters.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    return NextResponse.json({ presenters });
  } catch (error) {
    console.error('[api/admin/presenters] Failed to load presenters', error);
    return NextResponse.json({ error: 'Unable to load presenters.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { payload, errors } = sanitizePresenterPayload(body);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const insertPayload = {
      name: payload.name,
    };

    const { data, error } = await supabase
      .from('presenters')
      .insert(insertPayload)
      .select(SELECT_COLUMNS)
      .single();

    if (error) throw error;

    const presenter = normalizePresenter(data);

    return NextResponse.json({ presenter }, { status: 201 });
  } catch (error) {
    console.error('[api/admin/presenters] Failed to create presenter', error);
    return NextResponse.json({ error: 'Unable to create presenter.' }, { status: 500 });
  }
}
