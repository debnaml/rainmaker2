import { NextResponse } from 'next/server';
import { normalizeLeader, sanitizeLeaderPayload } from '/lib/leaders';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

const SELECT_COLUMNS = 'id, name, job_title, years_experience, past_companies, image_url, created_at, updated_at';

async function resolveLeaderId(context) {
  const rawParams = context?.params;
  const resolved = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
  const leaderId = resolved?.leaderId;
  if (!leaderId) {
    throw new Error('Leader id is required.');
  }
  return leaderId;
}

export async function PATCH(request, context) {
  try {
    let leaderId;
    try {
      leaderId = await resolveLeaderId(context);
    } catch (paramError) {
      return NextResponse.json({ error: paramError.message }, { status: 400 });
    }

    const body = await request.json();
    const { payload, errors } = sanitizeLeaderPayload(body);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const updates = {
      name: payload.name,
      job_title: payload.jobTitle,
      years_experience: payload.yearsExperience,
      past_companies: payload.pastCompanies,
      image_url: payload.imageUrl,
    };

    const { data, error } = await supabase
      .from('leaders')
      .update(updates)
      .eq('id', leaderId)
      .select(SELECT_COLUMNS)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Leader not found.' }, { status: 404 });
    }

    const leader = normalizeLeader(data);

    return NextResponse.json({ leader });
  } catch (error) {
    console.error('[api/admin/leaders] Failed to update leader', error);
    return NextResponse.json({ error: 'Unable to update leader.' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    let leaderId;
    try {
      leaderId = await resolveLeaderId(context);
    } catch (paramError) {
      return NextResponse.json({ error: paramError.message }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('leaders')
      .delete()
      .eq('id', leaderId)
      .select('id')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Leader not found.' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[api/admin/leaders] Failed to delete leader', error);
    return NextResponse.json({ error: 'Unable to delete leader.' }, { status: 500 });
  }
}
