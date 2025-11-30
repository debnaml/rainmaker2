import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '/lib/supabaseServer';
import { ALLOWED_MODULE_TYPES } from '/lib/modules/constants';
import { normalizeModule } from '../route';

const VALID_MODULE_TYPES = new Set(ALLOWED_MODULE_TYPES);

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

export async function PATCH(request, context) {
  try {
    const rawParams = context?.params;
    const resolvedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const moduleId = resolvedParams?.moduleId;
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
      const normalizedType =
        typeof type === 'string' && type.trim() ? type.trim().toLowerCase() : null;

      if (normalizedType && !VALID_MODULE_TYPES.has(normalizedType)) {
        return NextResponse.json(
          {
            error: `Type must be one of: ${ALLOWED_MODULE_TYPES.join(', ')}.`,
          },
          { status: 400 }
        );
      }

      updates.type = normalizedType;
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

export async function DELETE(request, context) {
  try {
    const rawParams = context?.params;
    const resolvedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const moduleId = resolvedParams?.moduleId;
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
