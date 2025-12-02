import { NextResponse } from 'next/server';
import { normalizePresenter, sanitizePresenterPayload } from '/lib/presenters';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

const SELECT_COLUMNS = '*';

async function resolvePresenterId(context) {
  const rawParams = context?.params;
  const resolved = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
  const presenterId = resolved?.presenterId;
  if (!presenterId) {
    throw new Error('Presenter id is required.');
  }
  return presenterId;
}

export async function PATCH(request, context) {
  try {
    let presenterId;
    try {
      presenterId = await resolvePresenterId(context);
    } catch (paramError) {
      return NextResponse.json({ error: paramError.message }, { status: 400 });
    }

    const body = await request.json();
    const { payload, errors } = sanitizePresenterPayload(body);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const updates = {
      name: payload.name,
    };

    const { data, error } = await supabase
      .from('presenters')
      .update(updates)
      .eq('id', presenterId)
      .select(SELECT_COLUMNS)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Presenter not found.' }, { status: 404 });
    }

    const presenter = normalizePresenter(data);

    return NextResponse.json({ presenter });
  } catch (error) {
    console.error('[api/admin/presenters] Failed to update presenter', error);
    return NextResponse.json({ error: 'Unable to update presenter.' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    let presenterId;
    try {
      presenterId = await resolvePresenterId(context);
    } catch (paramError) {
      return NextResponse.json({ error: paramError.message }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('presenters')
      .delete()
      .eq('id', presenterId)
      .select('id')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Presenter not found.' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[api/admin/presenters] Failed to delete presenter', error);
    return NextResponse.json({ error: 'Unable to delete presenter.' }, { status: 500 });
  }
}
