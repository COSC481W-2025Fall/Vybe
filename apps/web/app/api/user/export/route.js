import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import {
  createErrorResponse,
  checkRateLimit,
} from '@/lib/validation/serverValidation';

export const dynamic = 'force-dynamic';

async function makeSupabase() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

/**
 * GET /api/user/export
 * Generate user data export (GDPR data portability)
 * 
 * Returns:
 * - 200: JSON file download with all user data
 * - 401: Unauthorized
 * - 429: Too many requests (rate limited - 1 export per 24 hours)
 * - 500: Server error
 */
export async function GET(request) {
  try {
    const supabase = await makeSupabase();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Rate limiting: 1 export per 24 hours
    const rateLimitKey = user.id || 'anonymous';
    const rateLimit = checkRateLimit(rateLimitKey, {
      limit: 1, // 1 export per 24 hours
      windowMs: 24 * 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      const resetHours = Math.ceil((rateLimit.resetAt - Date.now()) / (60 * 60 * 1000));
      return NextResponse.json(
        createErrorResponse(
          'Rate limit exceeded',
          429,
          {
            message: `Data export is limited to once per 24 hours. Please try again in ${resetHours} hours.`,
            retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          }
        ),
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': '1',
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
          },
        }
      );
    }

    // Collect all user data
    const exportData = {
      export_metadata: {
        exported_at: new Date().toISOString(),
        user_id: userId,
        format_version: '1.0',
      },
      profile: {},
      preferences: {},
      listening_history: [],
      playlists: [],
      social_connections: [],
      settings: {},
    };

    try {
      // 1. Profile Information
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        exportData.profile = {
          id: profile.id,
          display_name: profile.display_name,
          bio: profile.bio,
          username: profile.username,
          profile_picture_url: profile.profile_picture_url,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        };
      }

      // Add auth information
      exportData.profile.auth = {
        email: user.email,
        email_verified: user.email_confirmed_at ? true : false,
        provider: user.app_metadata?.provider || 'email',
        created_at: user.created_at,
        last_sign_in: user.last_sign_in_at,
      };

      // 2. Privacy Settings
      const { data: privacySettings } = await supabase
        .from('user_privacy_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (privacySettings) {
        exportData.preferences.privacy = {
          profile_visibility: privacySettings.profile_visibility,
          playlist_visibility: privacySettings.playlist_visibility,
          listening_activity_visible: privacySettings.listening_activity_visible,
          song_of_day_visibility: privacySettings.song_of_day_visibility,
          friend_request_setting: privacySettings.friend_request_setting,
          searchable: privacySettings.searchable,
          activity_feed_visible: privacySettings.activity_feed_visible,
          created_at: privacySettings.created_at,
          updated_at: privacySettings.updated_at,
        };
      }

      // 3. Notification Preferences
      const { data: notificationPreferences } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (notificationPreferences) {
        exportData.preferences.notifications = {
          friend_requests_inapp: notificationPreferences.friend_requests_inapp,
          friend_requests_email: notificationPreferences.friend_requests_email,
          new_followers_inapp: notificationPreferences.new_followers_inapp,
          new_followers_email: notificationPreferences.new_followers_email,
          comments_inapp: notificationPreferences.comments_inapp,
          comments_email: notificationPreferences.comments_email,
          playlist_invites_inapp: notificationPreferences.playlist_invites_inapp,
          playlist_invites_email: notificationPreferences.playlist_invites_email,
          playlist_updates_inapp: notificationPreferences.playlist_updates_inapp,
          playlist_updates_email: notificationPreferences.playlist_updates_email,
          song_of_day_inapp: notificationPreferences.song_of_day_inapp,
          song_of_day_email: notificationPreferences.song_of_day_email,
          system_announcements_inapp: notificationPreferences.system_announcements_inapp,
          system_announcements_email: notificationPreferences.system_announcements_email,
          security_alerts_inapp: notificationPreferences.security_alerts_inapp,
          security_alerts_email: notificationPreferences.security_alerts_email,
          email_frequency: notificationPreferences.email_frequency,
          notifications_enabled: notificationPreferences.notifications_enabled,
          created_at: notificationPreferences.created_at,
          updated_at: notificationPreferences.updated_at,
        };
      }

      // 4. Listening History
      // Fetch all listening history (may be large, but we want complete export)
      const { data: history } = await supabase
        .from('play_history')
        .select('*')
        .eq('user_id', userId)
        .order('played_at', { ascending: false });

      if (history) {
        exportData.listening_history = history.map(item => ({
          track_id: item.track_id,
          track_name: item.track_name,
          artist_name: item.artist_name,
          album_name: item.album_name,
          played_at: item.played_at,
          duration_ms: item.duration_ms,
          spotify_uri: item.spotify_uri,
        }));
      }

      // 5. Playlists (if there's a playlists table)
      // Note: Adjust table name and structure based on your schema
      try {
        const { data: playlists } = await supabase
          .from('playlists')
          .select('*')
          .eq('user_id', userId)
          .or('owner_id.eq.' + userId);

        if (playlists) {
          exportData.playlists = playlists.map(playlist => ({
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            is_public: playlist.is_public,
            created_at: playlist.created_at,
            updated_at: playlist.updated_at,
            // Note: Song list would need separate query if stored in separate table
          }));
        }
      } catch (playlistError) {
        // Table might not exist - that's okay
        console.log('[data export] Playlists table not available:', playlistError.message);
      }

      // 6. Social Connections (if there's a connections/friends table)
      try {
        const { data: connections } = await supabase
          .from('friendships')
          .select('*')
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

        if (connections) {
          exportData.social_connections = connections.map(conn => ({
            friend_id: conn.friend_id === userId ? conn.user_id : conn.friend_id,
            status: conn.status,
            created_at: conn.created_at,
          }));
        }
      } catch (connectionError) {
        // Table might not exist - that's okay
        console.log('[data export] Connections table not available:', connectionError.message);
      }

      // 7. OAuth Connection Status
      const { data: spotifyToken } = await supabase
        .from('spotify_tokens')
        .select('user_id, expires_at')
        .eq('user_id', userId)
        .single();

      const { data: youtubeToken } = await supabase
        .from('youtube_tokens')
        .select('user_id, expires_at')
        .eq('user_id', userId)
        .single();

      exportData.settings.oauth_connections = {
        spotify_connected: !!spotifyToken,
        spotify_token_expires_at: spotifyToken?.expires_at || null,
        youtube_connected: !!youtubeToken,
        youtube_token_expires_at: youtubeToken?.expires_at || null,
      };

    } catch (dataError) {
      console.error('[data export] Error collecting data:', dataError);
      // Continue with partial data
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `vybe-data-export-${timestamp}.json`;

    // Convert to JSON string with pretty formatting
    const jsonString = JSON.stringify(exportData, null, 2);

    // Return as downloadable file
    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[data export] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to generate data export' },
      { status: 500 }
    );
  }
}

