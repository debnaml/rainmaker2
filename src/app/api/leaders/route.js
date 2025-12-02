import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '/lib/supabaseServer';
import { normalizeLeader } from '/lib/leaders';

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('leaders')
      .select('id, name, job_title, years_experience, past_companies, image_url, created_at, updated_at')
      .order('name', { ascending: true });

    if (error) throw error;

    const leaders = Array.isArray(data)
      ? data
          .map(normalizeLeader)
          .filter((record) => record && record.id && record.name)
      : [];

    return NextResponse.json({ leaders });
  } catch (error) {
    console.error('[api/leaders] Failed to load leaders', error);
    return NextResponse.json({ error: 'Unable to load leaders.' }, { status: 500 });
  }
}
