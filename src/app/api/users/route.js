import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

export async function POST(request) {
  try {
    const payload = await request.json();
    const email = payload?.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const { data: existingUser, error: lookupError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    const displayName = payload.displayName?.trim() || null;
    const avatarUrl = payload.avatarUrl ?? null;

    const baseProfile = {
      email,
      display_name: displayName,
      avatar_url: avatarUrl,
    };

    if (existingUser) {
      const needsUpdate =
        (displayName && displayName !== existingUser.display_name) ||
        (avatarUrl && avatarUrl !== existingUser.avatar_url);

      if (!needsUpdate) {
        return NextResponse.json({ user: existingUser });
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(baseProfile)
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ user: updatedUser });
    }

    const profileToInsert = {
  id: payload.id ?? randomUUID(),
      ...baseProfile,
    };

    if (payload.role) {
      profileToInsert.role = payload.role;
    }

    if (payload.peerGroupId) {
      profileToInsert.peer_group_id = payload.peerGroupId;
    }

    const { data: insertedUser, error: insertError } = await supabase
      .from('users')
      .insert(profileToInsert)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ user: insertedUser }, { status: 201 });
  } catch (error) {
    console.error('[api/users] Failed to sync user profile', error);
    return NextResponse.json({ error: 'Unable to sync user profile.' }, { status: 500 });
  }
}
