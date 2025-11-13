import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { clearPrivacyCache } from '@/lib/privacy/enforcer';

function createSupabaseClient() {
  return createRouteHandlerClient({ cookies });
}

// Allowed values
const PRIVACY_LEVELS = ['public', 'friends', 'private'];
const FRIEND_REQUEST_SETTINGS = ['everyone', 'friends_of_friends', 'nobody'];

// Default settings (same as privacy/enforcer getDefaultPrivacySettings)
function defaultPrivacySettings() {
  return {
    profile_visibility: 'public',
    playlist_visibility: 'public',
    listening_activity_visible: true,
    song_of_day_visibility: 'public',
    friend_request_setting: 'everyone',
    searchable: true,
    activity_feed_visible: true,
  };
}

// Validate incoming settings
function validateSettings(body) {
  const errors = [];

  const {
    profile_visibility,
    playlist_visibility,
    listening_activity_visible,
    song_of_day_visibility,
    friend_request_setting,
    searchable,
    activity_feed_visible,
  } = body;

  if (
    profile_visibility !== undefined &&
    !PRIVACY_LEVELS.includes(profile_visibility)
  ) {
    errors.push('profile_visibility must be one of: ' + PRIVACY_LEVELS.join(', '));
  }

  if (
    playlist_visibility !== undefined &&
    !PRIVACY_LEVELS.includes(playlist_visibility)
  ) {
    errors.push('playlist_visibility must be one of: ' + PRIVACY_LEVELS.join(', '));
  }

  if (
    song_of_day_visibility !== undefined &&
    !PRIVACY_LEVELS.includes(song_of_day_visibility)
  ) {
    errors.push('song_of_day_visibility must be one of: ' + PRIVACY_LEVELS.join(', '));
  }

  if (
    friend_request_setting !== undefined &&
    !FRIEND_REQUEST_SETTINGS.includes(friend_request_setting)
  ) {
    errors.push(
      'friend_request_setting must be one of: ' +
        FRIEND_REQUEST_SETTINGS.join(', '),
    );
  }

  if (
    listening_activity_visible !== undefined &&
    typeof listening_activity_visible !== 'boolean'
  ) {
    errors.push('listening_activity_visible must be a boolean');
  }

  if (searchable !== undefined && typeof searchable !== 'boolean') {
    errors.push('searchable must be a boolean');
  }

  if (
    activity_feed_visible !== undefined &&
    typeof activity_feed_visible !== 'boolean'
  ) {
    errors.push('activity_feed_visible must be a boolean');
  }

  return errors;
}

// ---------- GET /api/account/settings ----------
export async function GET(request) {
  const supabase = createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_privacy_settings')
    .select(
      'profile_visibility, playlist_visibility, listening_activity_visible, song_of_day_visibility, friend_request_setting, searchable, activity_feed_visible',
    )
    .eq('user_id', user.id)
    .single();

  // If no row yet, return defaults
  if (error && error.code === 'PGRST116') {
    return NextResponse.json(defaultPrivacySettings(), { status: 200 });
  }

  if (error) {
    console.error('[GET /api/account/settings] DB error:', error);
    return NextResponse.json(
      { error: 'Failed to load account settings' },
      { status: 500 },
    );
  }

  // Merge db values over defaults so all keys are present
  return NextResponse.json(
    {
      ...defaultPrivacySettings(),
      ...data,
    },
    { status: 200 },
  );
}

// ---------- PATCH /api/account/settings ----------
export async function PATCH(request) {
  const supabase = createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const errors = validateSettings(body);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
  }

  const known = defaultPrivacySettings();
  const updates = {};
  for (const key of Object.keys(known)) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('user_privacy_settings')
    .upsert(
      {
        user_id: user.id,
        ...updates,
      },
      { onConflict: 'user_id' },
    )
    .select(
      'profile_visibility, playlist_visibility, listening_activity_visible, song_of_day_visibility, friend_request_setting, searchable, activity_feed_visible',
    )
    .single();

  if (error) {
    console.error('[PATCH /api/account/settings] DB error:', error);
    return NextResponse.json(
      { error: 'Failed to update account settings' },
      { status: 500 },
    );
  }

  try {
    clearPrivacyCache(user.id);
  } catch (err) {
    console.warn('[PATCH /api/account/settings] Failed to clear privacy cache:', err);
  }

  return NextResponse.json(
    {
      ...defaultPrivacySettings(),
      ...data,
    },
    { status: 200 },
  );
}

// ---------- PUT /api/account/settings ----------
// PBI mentions PUT, so we treat PUT the same as PATCH
export async function PUT(request) {
  return PATCH(request);
}
