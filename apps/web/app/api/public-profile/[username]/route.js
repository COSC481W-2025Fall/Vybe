import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

// Make a Supabase client bound to cookies (same style as /api/user/profile)
function makeSupabase() {
  const cookieStore = cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

export async function GET(req, { params }) {
  try {
    // ⚠️ In new Next versions, params might be a Promise – be defensive
    const resolvedParams = await params;
    const username = resolvedParams?.username;

    if (!username) {
      return NextResponse.json(
        { error: 'Missing username' },
        { status: 400 }
      );
    }

    const supabase = makeSupabase();

    // DEBUG: log what we're querying for
    console.log('[public-profile] looking up username:', username);

    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, bio, profile_picture_url, is_public')
      .eq('username', username)
      .single();

    if (error) {
      console.error('[public-profile] Supabase error:', error);
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // If profile is private, return 403
    if (!data.is_public) {
      return NextResponse.json(
        { error: 'Profile is private' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        profile: {
          username: data.username,
          display_name: data.display_name,
          bio: data.bio,
          profile_picture_url: data.profile_picture_url,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[public-profile] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
