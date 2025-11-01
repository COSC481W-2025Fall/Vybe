import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { privacySchema, privacyPartialSchema, getDefaultPrivacySettings } from '@/lib/schemas/privacySchema';

export const dynamic = 'force-dynamic';

async function makeSupabase() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

/**
 * GET /api/user/privacy
 * Fetch current user's privacy settings
 * 
 * Returns:
 * - 200: Privacy settings object
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

    // Fetch privacy settings from user_privacy_settings table
    const { data: privacySettings, error: privacyError } = await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Handle case where table doesn't exist yet or no record found
    if (privacyError) {
      // PGRST116 = no rows returned (table exists but no record)
      // 42P01 = relation does not exist (table doesn't exist)
      // P0001 = other errors
      if (privacyError.code === 'PGRST116' || privacyError.code === '42P01') {
        // Table doesn't exist yet or no record exists - return defaults
        console.log('[privacy API] No privacy settings found, returning defaults');
        const defaults = getDefaultPrivacySettings();
        return NextResponse.json(defaults);
      }
      
      // Other errors - log but still return defaults to allow UI to work
      console.error('[privacy API] Error fetching privacy settings:', privacyError);
      const defaults = getDefaultPrivacySettings();
      return NextResponse.json(defaults);
    }

    // If no settings exist, return defaults
    if (!privacySettings) {
      const defaults = getDefaultPrivacySettings();
      return NextResponse.json(defaults);
    }

    // Return privacy settings in the expected format
    return NextResponse.json({
      profile_visibility: privacySettings.profile_visibility || 'public',
      playlist_visibility: privacySettings.playlist_visibility || 'public',
      listening_activity_visible: privacySettings.listening_activity_visible ?? true,
      song_of_day_visibility: privacySettings.song_of_day_visibility || 'public',
      friend_request_setting: privacySettings.friend_request_setting || 'everyone',
      searchable: privacySettings.searchable ?? true,
      activity_feed_visible: privacySettings.activity_feed_visible ?? true,
    });
  } catch (error) {
    console.error('[privacy API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/privacy
 * Update user privacy settings
 * 
 * Request body:
 * {
 *   profile_visibility?: 'public' | 'friends' | 'private'
 *   playlist_visibility?: 'public' | 'friends' | 'private'
 *   listening_activity_visible?: boolean
 *   song_of_day_visibility?: 'public' | 'friends' | 'private'
 *   friend_request_setting?: 'everyone' | 'friends_of_friends' | 'nobody'
 *   searchable?: boolean
 *   activity_feed_visible?: boolean
 * }
 * 
 * Returns:
 * - 200: Updated privacy settings
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

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate input against schema (use partial schema to allow partial updates)
    const validationResult = privacyPartialSchema.safeParse(body);
    if (!validationResult.success) {
      // Format validation errors for client
      const errors = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: errors,
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Check if privacy settings record exists
    const { data: existingSettings } = await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Prepare update data
    const updateData = {};
    
    if (validatedData.profile_visibility !== undefined) {
      updateData.profile_visibility = validatedData.profile_visibility;
    }
    if (validatedData.playlist_visibility !== undefined) {
      updateData.playlist_visibility = validatedData.playlist_visibility;
    }
    if (validatedData.listening_activity_visible !== undefined) {
      updateData.listening_activity_visible = validatedData.listening_activity_visible;
    }
    if (validatedData.song_of_day_visibility !== undefined) {
      updateData.song_of_day_visibility = validatedData.song_of_day_visibility;
    }
    if (validatedData.friend_request_setting !== undefined) {
      updateData.friend_request_setting = validatedData.friend_request_setting;
    }
    if (validatedData.searchable !== undefined) {
      updateData.searchable = validatedData.searchable;
    }
    if (validatedData.activity_feed_visible !== undefined) {
      updateData.activity_feed_visible = validatedData.activity_feed_visible;
    }

    // Update timestamp
    updateData.updated_at = new Date().toISOString();

    let result;
    if (existingSettings) {
      // Update existing record
      const { data: updatedSettings, error: updateError } = await supabase
        .from('user_privacy_settings')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('[privacy API] Error updating privacy settings:', updateError);
        return NextResponse.json(
          { error: 'Failed to update privacy settings' },
          { status: 500 }
        );
      }

      result = updatedSettings;
    } else {
      // Create new record with defaults merged with updates
      const defaults = getDefaultPrivacySettings();
      const newSettings = {
        user_id: user.id,
        ...defaults,
        ...updateData,
        created_at: new Date().toISOString(),
      };

      const { data: createdSettings, error: createError } = await supabase
        .from('user_privacy_settings')
        .insert(newSettings)
        .select()
        .single();

      if (createError) {
        console.error('[privacy API] Error creating privacy settings:', createError);
        return NextResponse.json(
          { error: 'Failed to create privacy settings' },
          { status: 500 }
        );
      }

      result = createdSettings;
    }

    // Audit logging: Log privacy changes
    try {
      // Create audit log entry
      const auditLog = {
        user_id: user.id,
        action: 'privacy_settings_updated',
        details: {
          changed_fields: Object.keys(updateData).filter(key => key !== 'updated_at'),
          previous_values: existingSettings ? {
            profile_visibility: existingSettings.profile_visibility,
            playlist_visibility: existingSettings.playlist_visibility,
            listening_activity_visible: existingSettings.listening_activity_visible,
            song_of_day_visibility: existingSettings.song_of_day_visibility,
            friend_request_setting: existingSettings.friend_request_setting,
            searchable: existingSettings.searchable,
            activity_feed_visible: existingSettings.activity_feed_visible,
          } : null,
          new_values: updateData,
        },
        created_at: new Date().toISOString(),
      };

      // Try to insert audit log (if table exists)
      // Note: This will fail silently if audit table doesn't exist yet
      await supabase
        .from('privacy_settings_audit_log')
        .insert(auditLog)
        .catch((error) => {
          // Log but don't fail the request if audit logging fails
          console.log('[privacy API] Audit logging not available:', error.message);
        });
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      console.log('[privacy API] Could not log privacy changes:', auditError.message);
    }

    // Return updated privacy settings in the expected format
    return NextResponse.json({
      profile_visibility: result.profile_visibility || 'public',
      playlist_visibility: result.playlist_visibility || 'public',
      listening_activity_visible: result.listening_activity_visible ?? true,
      song_of_day_visibility: result.song_of_day_visibility || 'public',
      friend_request_setting: result.friend_request_setting || 'everyone',
      searchable: result.searchable ?? true,
      activity_feed_visible: result.activity_feed_visible ?? true,
      message: 'Privacy settings updated successfully',
    });
  } catch (error) {
    console.error('[privacy API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

