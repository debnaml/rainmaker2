import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase.from('lesson_tags').select('tag').order('tag', { ascending: true });
    if (error) throw error;

    const unique = new Map();
    if (Array.isArray(data)) {
      data.forEach((row) => {
        const value = typeof row?.tag === 'string' ? row.tag.trim() : '';
        if (!value) return;
        const key = value.toLowerCase();
        if (!unique.has(key)) {
          unique.set(key, value);
        }
      });
    }

    const tags = Array.from(unique.values()).slice(0, 200);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('[api/admin/tags] Failed to load tags', error);
    return NextResponse.json({ error: 'Unable to load tags.' }, { status: 500 });
  }
}
