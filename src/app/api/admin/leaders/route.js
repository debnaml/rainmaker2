import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { normalizeLeader, sanitizeLeaderPayload } from '/lib/leaders';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

const SELECT_COLUMNS = 'id, name, job_title, years_experience, past_companies, image_url, created_at, updated_at';

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase.from('leaders').select(SELECT_COLUMNS).order('created_at', { ascending: false });

    if (error) throw error;

    const leaders = Array.isArray(data)
      ? data
          .map(normalizeLeader)
          .filter((record) => record && record.id && record.name)
      : [];

    return NextResponse.json({ leaders });
  } catch (error) {
    console.error('[api/admin/leaders] Failed to load leaders', error);
    return NextResponse.json({ error: 'Unable to load leaders.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { payload, errors } = sanitizeLeaderPayload(body);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const leaderId = randomUUID();
    const insertPayload = {
      id: leaderId,
      name: payload.name,
      job_title: payload.jobTitle,
      years_experience: payload.yearsExperience,
      past_companies: payload.pastCompanies,
      image_url: payload.imageUrl,
    };

    const { data, error } = await supabase.from('leaders').insert(insertPayload).select(SELECT_COLUMNS).single();

    if (error) throw error;

    const leader = normalizeLeader(data);

    return NextResponse.json({ leader }, { status: 201 });
  } catch (error) {
    console.error('[api/admin/leaders] Failed to create leader', error);
    return NextResponse.json({ error: 'Unable to create leader.' }, { status: 500 });
  }
}
