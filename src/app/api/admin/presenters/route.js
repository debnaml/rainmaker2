import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '/lib/supabaseServer';
import { derivePresenterDisplayName } from '/lib/presenters';

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase.from('presenters').select('*').order('id', { ascending: true });

    if (error) throw error;

    const presenters = Array.isArray(data)
      ? data
          .map((record) => {
            const displayName = derivePresenterDisplayName(record);
            if (!record?.id || !displayName) return null;
            return {
              id: record.id,
              name: displayName,
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      : [];

    return NextResponse.json({ presenters });
  } catch (error) {
    console.error('[api/admin/presenters] Failed to load presenters', error);
    return NextResponse.json({ error: 'Unable to load presenters.' }, { status: 500 });
  }
}
