import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { notificationSchema, notificationPartialSchema, getDefaultNotificationPreferences } from '@/lib/schemas/notificationSchema';
import {
  validateRequest,
  formatValidationErrors,
  createErrorResponse,
  logValidationFailure,
  checkRateLimit,
} from '@/lib/validation/serverValidation';

export const dynamic = 'force-dynamic';

async function makeSupabase() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

/**
 * GET /api/user/notifications
 * Fetch current user's notification preferences
 * 
 * Returns:
 * - 200: Notification preferences object
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function GET() {
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

    // Fetch notification preferences from user_notification_preferences table
    const { data: notificationPreferences, error: notificationError } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Handle case where table doesn't exist yet or no record found
    if (notificationError) {
      // PGRST116 = no rows returned (table exists but no record)
      // 42P01 = relation does not exist (table doesn't exist)
      // PGRST205 = table not found in schema cache (table doesn't exist)
      if (notificationError.code === 'PGRST116' || notificationError.code === '42P01' || notificationError.code === 'PGRST205') {
        // Table doesn't exist yet or no record exists - return defaults
        // Don't log as error - this is expected if migrations haven't run
        const defaults = getDefaultNotificationPreferences();
        return NextResponse.json(defaults);
      }
      
      // Other errors - log but still return defaults to allow UI to work
      console.error('[notifications API] Error fetching notification preferences:', notificationError);
      const defaults = getDefaultNotificationPreferences();
      return NextResponse.json(defaults);
    }

    // If no settings exist, return defaults
    if (!notificationPreferences) {
      const defaults = getDefaultNotificationPreferences();
      return NextResponse.json(defaults);
    }

    // Return notification preferences in the expected format
    return NextResponse.json({
      // Social Notifications
      friend_requests_inapp: notificationPreferences.friend_requests_inapp ?? true,
      friend_requests_email: notificationPreferences.friend_requests_email ?? true,
      new_followers_inapp: notificationPreferences.new_followers_inapp ?? true,
      new_followers_email: notificationPreferences.new_followers_email ?? false,
      comments_inapp: notificationPreferences.comments_inapp ?? true,
      comments_email: notificationPreferences.comments_email ?? false,
      
      // Playlist Notifications
      playlist_invites_inapp: notificationPreferences.playlist_invites_inapp ?? true,
      playlist_invites_email: notificationPreferences.playlist_invites_email ?? true,
      playlist_updates_inapp: notificationPreferences.playlist_updates_inapp ?? true,
      playlist_updates_email: notificationPreferences.playlist_updates_email ?? false,
      
      // System Notifications
      song_of_day_inapp: notificationPreferences.song_of_day_inapp ?? true,
      song_of_day_email: notificationPreferences.song_of_day_email ?? false,
      system_announcements_inapp: notificationPreferences.system_announcements_inapp ?? true,
      system_announcements_email: notificationPreferences.system_announcements_email ?? true,
      security_alerts_inapp: notificationPreferences.security_alerts_inapp ?? true, // Always true
      security_alerts_email: notificationPreferences.security_alerts_email ?? true, // Always true
      
      // Email Frequency
      email_frequency: notificationPreferences.email_frequency || 'instant',
      
      // Master Toggle
      notifications_enabled: notificationPreferences.notifications_enabled ?? true,
    });
  } catch (error) {
    console.error('[notifications API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/notifications
 * Update user notification preferences
 * 
 * Request body:
 * {
 *   friend_requests_inapp?: boolean
 *   friend_requests_email?: boolean
 *   new_followers_inapp?: boolean
 *   new_followers_email?: boolean
 *   comments_inapp?: boolean
 *   comments_email?: boolean
 *   playlist_invites_inapp?: boolean
 *   playlist_invites_email?: boolean
 *   playlist_updates_inapp?: boolean
 *   playlist_updates_email?: boolean
 *   song_of_day_inapp?: boolean
 *   song_of_day_email?: boolean
 *   system_announcements_inapp?: boolean
 *   system_announcements_email?: boolean
 *   security_alerts_inapp?: boolean (always true, enforced)
 *   security_alerts_email?: boolean (always true, enforced)
 *   email_frequency?: 'instant' | 'daily' | 'weekly'
 *   notifications_enabled?: boolean
 * }
 * 
 * Returns:
 * - 200: Updated notification preferences
 * - 400: Validation error
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function PUT(request) {
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

    // Rate limiting
    const rateLimitKey = user.id || 'anonymous';
    const rateLimit = checkRateLimit(rateLimitKey, {
      limit: 10, // 10 updates per minute
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      const resetSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        createErrorResponse(
          'Rate limit exceeded',
          429,
          {
            message: `Too many requests. Please try again in ${resetSeconds} seconds.`,
            retryAfter: resetSeconds,
          }
        ),
        {
          status: 429,
          headers: {
            'Retry-After': String(resetSeconds),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
          },
        }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        createErrorResponse('Invalid JSON in request body', 400),
        { status: 400 }
      );
    }

    // Ensure security alerts are always enabled (enforce at API level)
    body.security_alerts_inapp = true;
    body.security_alerts_email = true;

    // Validate and sanitize input (use partial schema to allow partial updates)
    const validationResult = validateRequest(body, notificationPartialSchema, {
      endpoint: '/api/user/notifications',
      userId: user.id,
      sanitize: true,
      logErrors: true,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        validationResult.errors,
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Check if notification preferences record exists
    const { data: existingPreferences } = await supabase
      .from('user_notification_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Prepare data for database update
    const updateData = {
      user_id: user.id,
      ...validatedData,
      // Ensure security alerts are always true
      security_alerts_inapp: true,
      security_alerts_email: true,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existingPreferences) {
      // Update existing record
      const { data: updatedPreferences, error: updateError } = await supabase
        .from('user_notification_preferences')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('[notifications API] Error updating notification preferences:', updateError);
        return NextResponse.json(
          { error: 'Failed to update notification preferences' },
          { status: 500 }
        );
      }

      result = updatedPreferences;
    } else {
      // Create new record
      const { data: newPreferences, error: insertError } = await supabase
        .from('user_notification_preferences')
        .insert(updateData)
        .select()
        .single();

      if (insertError) {
        console.error('[notifications API] Error creating notification preferences:', insertError);
        // Check if table doesn't exist
        if (insertError.code === '42P01') {
          return NextResponse.json(
            { 
              error: 'Notification preferences table not available yet',
              message: 'Please contact support or try again later',
            },
            { status: 503 }
          );
        }
        return NextResponse.json(
          { error: 'Failed to create notification preferences' },
          { status: 500 }
        );
      }

      result = newPreferences;
    }

    // Return updated notification preferences in the expected format
    return NextResponse.json({
      // Social Notifications
      friend_requests_inapp: result.friend_requests_inapp ?? true,
      friend_requests_email: result.friend_requests_email ?? true,
      new_followers_inapp: result.new_followers_inapp ?? true,
      new_followers_email: result.new_followers_email ?? false,
      comments_inapp: result.comments_inapp ?? true,
      comments_email: result.comments_email ?? false,
      
      // Playlist Notifications
      playlist_invites_inapp: result.playlist_invites_inapp ?? true,
      playlist_invites_email: result.playlist_invites_email ?? true,
      playlist_updates_inapp: result.playlist_updates_inapp ?? true,
      playlist_updates_email: result.playlist_updates_email ?? false,
      
      // System Notifications
      song_of_day_inapp: result.song_of_day_inapp ?? true,
      song_of_day_email: result.song_of_day_email ?? false,
      system_announcements_inapp: result.system_announcements_inapp ?? true,
      system_announcements_email: result.system_announcements_email ?? true,
      security_alerts_inapp: true, // Always true
      security_alerts_email: true, // Always true
      
      // Email Frequency
      email_frequency: result.email_frequency || 'instant',
      
      // Master Toggle
      notifications_enabled: result.notifications_enabled ?? true,
      
      // Success message
      message: 'Notification preferences updated successfully',
    });
  } catch (error) {
    console.error('[notifications API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

