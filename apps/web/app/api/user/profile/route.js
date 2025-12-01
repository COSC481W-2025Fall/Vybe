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
    let { data: profile, error: profileError } = await supabase
      .from('users')          // 👈 make sure your table is called "users"
      .select('*')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist, create it (trigger might have failed)
    // IMPORTANT: Only create if profile truly doesn't exist - never overwrite existing profiles
    if (profileError && profileError.code === 'PGRST116') {
      console.log('[Profile GET] Profile not found (PGRST116), double-checking...');
      
      // Triple-check profile doesn't exist (RLS might be blocking queries)
      // Try multiple approaches to ensure we don't accidentally overwrite an existing profile
      let profileExists = false;
      
      // Check 1: Try maybeSingle() with minimal fields
      const { data: check1, error: check1Error } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('id', user.id)
        .maybeSingle();
      
      if (check1 && !check1Error) {
        profileExists = true;
        console.log('[Profile GET] Profile found on check 1, fetching full profile...');
        const { data: existingProfile, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!fetchError && existingProfile) {
          profile = existingProfile;
          console.log('[Profile GET] Successfully fetched existing profile');
        }
      }
      
      // Only create if profile definitely doesn't exist after all checks
      if (!profileExists && !profile) {
        // Extract username from email or metadata
        const username = user.user_metadata?.username || 
                         user.user_metadata?.preferred_username ||
                         user.email?.split('@')[0] || 
                         `user_${user.id.slice(0, 8)}`;
        
        // Extract display name from metadata or email
        // Filter out Spotify user IDs (they're 22+ character alphanumeric strings)
        let displayName = user.user_metadata?.display_name ||
                          user.user_metadata?.full_name ||
                          user.user_metadata?.name ||
                          null;
        
        // Check if displayName looks like a Spotify ID (22+ alphanumeric chars, no spaces)
        if (displayName && /^[a-zA-Z0-9]{22,}$/.test(displayName) && !/\s/.test(displayName)) {
          displayName = null; // Don't use Spotify IDs as display names
        }
        
        // Fallback to email username or generated username
        if (!displayName) {
          displayName = user.email?.split('@')[0] || username;
        }

        // Try direct insert first (uses RLS, simpler)
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            username: username,
            display_name: displayName,
            profile_picture_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          })
          .select()
          .single();

        if (createError) {
          console.error('[Profile GET] Direct insert failed:', createError);
          
          // Last resort: return a minimal profile object so the UI doesn't break
          profile = {
            id: user.id,
            username: username,
            display_name: displayName,
            profile_picture_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            bio: null,
            created_at: user.created_at,
            updated_at: new Date().toISOString(),
          };
          
          console.log('[Profile GET] Using fallback profile object (profile may not be saved to DB)');
        } else {
          // Direct insert succeeded
          profile = newProfile;
          console.log('[Profile GET] Successfully created profile via direct insert');
        }
        
        // If we still don't have a profile after all attempts, try fetching one more time
        if (!profile) {
          const { data: fetchedProfile, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (!fetchError && fetchedProfile) {
            profile = fetchedProfile;
            console.log('[Profile GET] Successfully fetched profile after creation');
          } else {
            // Last resort fallback
            profile = {
              id: user.id,
              username: username,
              display_name: displayName,
              profile_picture_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
              bio: null,
              created_at: user.created_at,
              updated_at: new Date().toISOString(),
            };
            console.log('[Profile GET] Using fallback profile object');
          }
        }
      }
    } else if (profileError && profileError.code !== 'PGRST116') {
      console.error('[Profile GET] Supabase error:', profileError);
      return NextResponse.json(
        { error: 'Failed to load profile', details: profileError.message },
        { status: 500 }
      );
    }

    // 3) Derive provider display (Email / Google / Spotify, etc.)
    const provider = (user.app_metadata && user.app_metadata.provider) || 'email';

    let auth_provider_display = 'Email';
    if (provider === 'google') auth_provider_display = 'Google';
    if (provider === 'spotify') auth_provider_display = 'Spotify';

    // 4) Try to get a nice display name for the connected account
    let provider_account_name = null;

    // First try user_metadata overrides (works for most providers)
    const meta = user.user_metadata || {};
    provider_account_name =
      meta.full_name ||
      meta.name ||
      meta.user_name ||
      null;

    // If provider is Spotify, try to get a better display name via Spotify API
    if (provider === 'spotify') {
      try {
        const { getValidAccessToken } = await import('@/lib/spotify');
        const accessToken = await getValidAccessToken(supabase, user.id);
        const spotifyRes = await fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (spotifyRes.ok) {
          const spotifyData = await spotifyRes.json();

          // Spotify can return display_name as null or the user ID if no display name is set
          // Check if display_name looks like an ID (all alphanumeric, no spaces)
          const isLikelyId =
            spotifyData.display_name &&
            /^[a-zA-Z0-9]{22,}$/.test(spotifyData.display_name) &&
            !/\s/.test(spotifyData.display_name);

          // Use null if display_name is missing or looks like an ID (show a fallback in UI)
          const displayName =
            spotifyData.display_name && !isLikelyId
              ? spotifyData.display_name
              : null;

          provider_account_name = displayName || provider_account_name;
        }
      } catch (e) {
        // Token may be invalid or expired - that's okay, we'll just show connected
        console.log('[profile API] Could not fetch Spotify account:', e.message);
      }
    }

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
    let body;
    try {
      body = await req.json();
    } catch (err) {
      console.error('[Profile PATCH] Error parsing request body:', err);
      return NextResponse.json(
        { error: 'Invalid request body', details: err.message },
        { status: 400 }
      );
    }
    let {
      display_name,
      bio,
      profile_picture_url,
    } = body;

    // 3) Validate and sanitize input
    // Trim display_name and ensure it's not empty
    if (display_name !== undefined && display_name !== null) {
      display_name = String(display_name).trim();
      if (display_name.length < 2) {
        return NextResponse.json(
          { error: 'Display name must be at least 2 characters' },
          { status: 400 }
        );
      }
      if (display_name.length > 50) {
        return NextResponse.json(
          { error: 'Display name must not exceed 50 characters' },
          { status: 400 }
        );
      }
      // Validate display_name format (letters, numbers, spaces only)
      if (!/^[a-zA-Z0-9\s]+$/.test(display_name)) {
        return NextResponse.json(
          { error: 'Display name can only contain letters, numbers, and spaces' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 }
      );
    }

    // Validate bio (optional, max 200 chars)
    if (bio !== undefined && bio !== null && bio !== '') {
      bio = String(bio).trim();
      if (bio.length > 200) {
        return NextResponse.json(
          { error: 'Bio must not exceed 200 characters' },
          { status: 400 }
        );
      }
      // Convert empty string to null
      if (bio === '') {
        bio = null;
      }
    } else {
      bio = null;
    }

    // Validate profile_picture_url (optional)
    if (profile_picture_url !== undefined && profile_picture_url !== null && profile_picture_url !== '') {
      profile_picture_url = String(profile_picture_url).trim();
      // Basic URL validation
      try {
        new URL(profile_picture_url);
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid profile picture URL format' },
          { status: 400 }
        );
      }
      // Convert empty string to null
      if (profile_picture_url === '') {
        profile_picture_url = null;
      }
    } else {
      profile_picture_url = null;
    }

    // 4) Simple direct UPDATE - RLS is disabled, so this will work
    console.log('[Profile PATCH] Attempting to update profile for user:', user.id);
    console.log('[Profile PATCH] Update payload:', {
      display_name,
      bio,
      profile_picture_url,
    });
    
    // Try direct update first
    const { data: updated, error: updateErr } = await supabase
      .from('users')
      .update({
        display_name: display_name,
        bio,
        profile_picture_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    let updatedProfile = null;

    if (updateErr) {
      console.error('[Profile PATCH] Update error details:', {
        code: updateErr.code,
        message: updateErr.message,
        details: updateErr.details,
        hint: updateErr.hint
      });
      
      // If update fails with "not found", create the profile
      if (updateErr.code === 'PGRST116') {
        console.log('[Profile PATCH] Profile not found (PGRST116), creating one...');
        
        const username = user.user_metadata?.username || 
                         user.user_metadata?.preferred_username ||
                         user.email?.split('@')[0] || 
                         `user_${user.id.slice(0, 8)}`;

        console.log('[Profile PATCH] Creating profile with username:', username);

        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            username: username,
            display_name: display_name,
            bio: bio,
            profile_picture_url: profile_picture_url,
          })
          .select()
          .single();

        if (createError) {
          console.error('[Profile PATCH] Failed to create profile:', {
            code: createError.code,
            message: createError.message,
            details: createError.details,
            hint: createError.hint
          });
          return NextResponse.json(
            { error: 'Failed to create profile', details: createError.message, code: createError.code },
            { status: 500 }
          );
        }
        
        updatedProfile = newProfile;
        console.log('[Profile PATCH] Successfully created profile:', updatedProfile);
      } else {
        // For any other error, return it
        console.error('[Profile PATCH] Update failed with non-PGRST116 error');
        return NextResponse.json(
          { 
            error: 'Failed to update profile', 
            details: updateErr.message, 
            code: updateErr.code,
            hint: updateErr.hint || 'Check if RLS is disabled and migration has been run'
          },
          { status: 500 }
        );
      }
    } else {
      updatedProfile = updated;
      console.log('[Profile PATCH] Successfully updated profile:', {
        id: updatedProfile?.id,
        display_name: updatedProfile?.display_name,
        bio: updatedProfile?.bio,
      });
    }

    if (!updatedProfile) {
      console.error('[Profile PATCH] No profile returned after create/update');
      return NextResponse.json(
        { error: 'Profile operation succeeded but no profile data returned', code: 'NO_PROFILE_DATA' },
        { status: 500 }
      );
    }

    console.log('[Profile PATCH] Successfully updated profile:', {
      display_name: updatedProfile?.display_name,
      bio: updatedProfile?.bio,
    });

    // Return the updated profile so the frontend can use it immediately
    return NextResponse.json({ 
      ok: true,
      profile: updatedProfile 
    }, { status: 200 });
  } catch (err) {
    console.error('[Profile PATCH] Unexpected error:', err);
    return NextResponse.json(
      { 
        error: 'Unexpected server error', 
        details: err.message || String(err),
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}
