import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '/lib/supabaseServer';
import { normalizeModule } from '../route';

function parseSequence(sequence) {
  if (sequence === undefined) return undefined;
  if (sequence === null) return null;
  const trimmed = String(sequence).trim();
  if (trimmed.length === 0) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return Number.NaN;
  }
  return value;
}

export async function PATCH(request, { params }) {
  try {
    const moduleId = params?.moduleId;
    if (!moduleId) {
      return NextResponse.json({ error: 'Module id is required.' }, { status: 400 });
    }

    const body = await request.json();
    const { title, type, sequence } = body ?? {};

    const updates = {};

    if (title !== undefined) {
      if (!title || typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
      }
      updates.title = title.trim();
    }

    if (type !== undefined) {
      updates.type = typeof type === 'string' && type.trim() ? type.trim() : null;
    }

    if (sequence !== undefined) {
      const parsedSequence = parseSequence(sequence);
      if (Number.isNaN(parsedSequence)) {
        return NextResponse.json({ error: 'Sequence must be a number.' }, { status: 400 });
      }
      if (parsedSequence !== undefined) {
        updates.sequence = parsedSequence;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No changes provided.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('modules')
      .update(updates)
      .eq('id', moduleId)
      .select('id, title, type, sequence')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Module not found.' }, { status: 404 });
    }

    const moduleRecord = normalizeModule(data);

    return NextResponse.json({ module: moduleRecord });
  } catch (error) {
    console.error('[api/admin/modules] Failed to update module', error);
    return NextResponse.json({ error: 'Unable to update module.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const moduleId = params?.moduleId;
    if (!moduleId) {
      return NextResponse.json({ error: 'Module id is required.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('modules')
      .delete()
      .eq('id', moduleId)
      .select('id')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Module not found.' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[api/admin/modules] Failed to delete module', error);
    return NextResponse.json({ error: 'Unable to delete module.' }, { status: 500 });
  }
}
