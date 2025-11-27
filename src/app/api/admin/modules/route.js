import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

export function normalizeModule(record) {
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

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, type = null, sequence = null } = body ?? {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    let sequenceValue = null;
    if (sequence !== null && sequence !== undefined && String(sequence).trim() !== '') {
      const parsedSequence = Number(sequence);
      if (!Number.isFinite(parsedSequence)) {
        return NextResponse.json({ error: 'Sequence must be a number.' }, { status: 400 });
      }
      sequenceValue = parsedSequence;
    }

    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('modules')
      .insert({
        title: title.trim(),
        type: typeof type === 'string' && type.trim() ? type.trim() : null,
        sequence: sequenceValue,
      })
      .select('id, title, type, sequence')
      .single();

    if (error) throw error;

    const moduleRecord = normalizeModule(data);

    return NextResponse.json({ module: moduleRecord }, { status: 201 });
  } catch (error) {
    console.error('[api/admin/modules] Failed to create module', error);
    return NextResponse.json({ error: 'Unable to create module.' }, { status: 500 });
  }
}
