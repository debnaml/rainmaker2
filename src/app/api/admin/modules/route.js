import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

function normalizeModule(record) {
  if (!record) return null;
  return {
    id: record.id,
    title: record.title ?? 'Untitled module',
    type: record.type ?? null,
    sequence: record.sequence ?? null,
  };
}

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('modules')
      .select('id, title, type, sequence')
      .order('type', { ascending: true })
      .order('sequence', { ascending: true, nullsFirst: true });

    if (error) throw error;

    const modules = Array.isArray(data)
      ? data
          .map(normalizeModule)
          .filter(Boolean)
      : [];

    return NextResponse.json({ modules });
  } catch (error) {
    console.error('[api/admin/modules] Failed to load modules', error);
    return NextResponse.json({ error: 'Unable to load modules.' }, { status: 500 });
  }
}
