import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

async function makeSupabase() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

/**
 * GET /api/user/profile
 * Return merged auth user + profile row
 */
export async function GET() {
  try {
    const supabase = await makeSupabase();

    // 1) Auth user (from auth.users)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2) Profile from your public "users" table
    const { data: profile, error: profileError } = await supabase
      .from('users')          // 👈 make sure your table is called "users"
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[Profile GET] Supabase error:', profileError);
      return NextResponse.json(
        { error: 'Failed to load profile' },
        { status: 500 }
      );
    }

    // 3) Derive provider display (Email / Google / Spotify, etc.)
    const provider = (user.app_metadata && user.app_metadata.provider) || 'email';

    let auth_provider_display = 'Email';
    if (provider === 'google') auth_provider_display = 'Google';
    if (provider === 'spotify') auth_provider_display = 'Spotify';

    // 4) Try to get a nice display name for the connected account
    const meta = user.user_metadata || {};
    const provider_account_name =
      meta.full_name ||
      meta.name ||
      meta.user_name ||
      null;

    // 5) Build the object returned to the frontend
    const responseBody = {
      // all columns from your "users" table (display_name, bio, etc.)
      ...profile,

      // auth / account info for Account Information section
      email: user.email,
      email_verified: !!user.email_confirmed_at,
      created_at: user.created_at,
      auth_provider_display,
      provider_account_name,
    };

    return NextResponse.json(responseBody);
  } catch (err) {
    console.error('[Profile GET] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Update current user's profile
 */
export async function PATCH(req) {
  try {
    const supabase = await makeSupabase();

    // 1) Check auth
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[Profile PATCH] Unauthorized:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2) Get new values from body
    const body = await req.json();
    const {
      display_name,
      bio,
      profile_picture_url,
      is_public, // must match your column name
    } = body;

    // 3) Update users table
    const { error: updateError } = await supabase
      .from('users') // 👈 again, make sure table name is correct
      .update({
        display_name,
        bio,
        profile_picture_url,
        is_public,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Profile PATCH] Supabase error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Profile PATCH] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}
