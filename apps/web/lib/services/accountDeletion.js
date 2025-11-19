/**
 * Account Deletion Service
 * 
 * Service layer for account deletion operations.
 * Provides reusable functions for deleting user accounts and associated data.
 */

/**
 * Verify password for email-based authentication
 * @param {Object} supabase - Supabase client instance
 * @param {Object} user - User object from auth
 * @param {string} password - Password to verify
 * @returns {Promise<boolean>} True if password is correct
 */
export async function verifyPassword(supabase, user, password) {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    });

    if (error) {
      return false;
    }

    // Re-authenticate to get fresh session
    const { data: { user: verifiedUser } } = await supabase.auth.getUser();
    return verifiedUser && verifiedUser.id === user.id;
  } catch (error) {
    console.error('[accountDeletion] Password verification error:', error);
    return false;
  }
}

/**
 * Check if account is old enough to be deleted (24-hour minimum)
 * @param {Object} user - User object from auth
 * @returns {Object} { isOldEnough: boolean, hoursSinceCreation: number, hoursRemaining: number }
 */
export function checkAccountAge(user) {
  const accountCreatedAt = new Date(user.created_at);
  const now = new Date();
  const hoursSinceCreation = (now - accountCreatedAt) / (1000 * 60 * 60);
  const isOldEnough = hoursSinceCreation >= 24;
  const hoursRemaining = isOldEnough ? 0 : Math.ceil(24 - hoursSinceCreation);

  return {
    isOldEnough,
    hoursSinceCreation: Math.floor(hoursSinceCreation),
    hoursRemaining,
  };
}

/**
 * Delete profile picture from Supabase Storage
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
export async function deleteProfilePicture(supabase, userId) {
  try {
    // Get user profile to check for profile picture
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('profile_picture_url')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.profile_picture_url) {
      // No profile picture to delete
      return { success: true };
    }

    // Extract file path from URL
    const urlParts = profile.profile_picture_url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const userFolderId = urlParts[urlParts.length - 2];

    // Delete specific file
    const { error: fileError } = await supabase.storage
      .from('profile-pictures')
      .remove([`${userFolderId}/${fileName}`]);

    if (fileError) {
      console.error('[accountDeletion] Error deleting profile picture file:', fileError);
    }

    // Try to delete entire user folder as cleanup
    try {
      const { data: files } = await supabase.storage
        .from('profile-pictures')
        .list(userFolderId);

      if (files && files.length > 0) {
        const filePaths = files.map(file => `${userFolderId}/${file.name}`);
        const { error: folderError } = await supabase.storage
          .from('profile-pictures')
          .remove(filePaths);

        if (folderError) {
          console.error('[accountDeletion] Error cleaning up storage folder:', folderError);
        }
      }
    } catch (listError) {
      console.error('[accountDeletion] Error listing storage files:', listError);
    }

    return { success: true };
  } catch (error) {
    console.error('[accountDeletion] Profile picture deletion error:', error);
    // Return success even if cleanup fails - don't block account deletion
    return { success: true, error: error.message };
  }
}

/**
 * Delete OAuth tokens for a user
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { success: boolean, deleted: { spotify: boolean, youtube: boolean } }
 */
export async function deleteOAuthTokens(supabase, userId) {
  try {
    const results = await Promise.allSettled([
      supabase.from('spotify_tokens').delete().eq('user_id', userId),
      supabase.from('youtube_tokens').delete().eq('user_id', userId),
    ]);

    const spotifySuccess = results[0].status === 'fulfilled';
    const youtubeSuccess = results[1].status === 'fulfilled';

    if (!spotifySuccess) {
      console.error('[accountDeletion] Spotify token deletion error:', results[0].reason);
    }
    if (!youtubeSuccess) {
      console.error('[accountDeletion] YouTube token deletion error:', results[1].reason);
    }

    return {
      success: true,
      deleted: {
        spotify: spotifySuccess,
        youtube: youtubeSuccess,
      },
    };
  } catch (error) {
    console.error('[accountDeletion] OAuth token deletion error:', error);
    // Return success even if some deletions fail
    return { success: true, deleted: { spotify: false, youtube: false } };
  }
}

/**
 * Delete user from users table
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
export async function deleteUserFromTable(supabase, userId) {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('[accountDeletion] Users table deletion error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[accountDeletion] Users table deletion error:', error);
    // Continue even if deletion fails (table might not exist)
    return { success: true, error: error.message };
  }
}

/**
 * Log account deletion to audit table
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId - User ID
 * @param {Object} options - Logging options
 * @param {string} options.reason - Optional reason for deletion
 * @param {string} options.authProvider - Authentication provider
 * @param {number} options.accountAgeHours - Account age in hours
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
export async function logAccountDeletion(supabase, userId, options = {}) {
  try {
    const { error } = await supabase
      .from('account_deletion_log')
      .insert({
        user_id: userId,
        reason: options.reason || null,
        deletion_method: 'user_request',
        metadata: {
          auth_provider: options.authProvider || 'email',
          account_age_hours: options.accountAgeHours || 0,
        },
      });

    if (error) {
      // Don't fail if audit table doesn't exist
      if (error.code === '42P01') {
        console.log('[accountDeletion] Audit logging not available (table does not exist)');
        return { success: true, skipped: true };
      }
      console.error('[accountDeletion] Audit logging error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    // Don't fail deletion if audit logging fails
    console.log('[accountDeletion] Could not log deletion:', error.message);
    return { success: true, skipped: true };
  }
}

/**
 * Sign out user from current session
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
export async function signOutUser(supabase) {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[accountDeletion] Sign out error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('[accountDeletion] Sign out error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Permanently delete user account and all associated data
 * 
 * This function orchestrates the complete account deletion process:
 * 1. Deletes profile picture from storage
 * 2. Deletes OAuth tokens
 * 3. Deletes user from users table (cascade deletes handle related data)
 * 4. Signs out user
 * 
 * Note: Actual deletion from auth.users requires Admin API (not included here)
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {Object} user - User object from auth
 * @param {Object} options - Deletion options
 * @param {string} options.reason - Optional reason for deletion
 * @returns {Promise<Object>} { success: boolean, deleted: Object, error?: string }
 */
export async function deleteAccount(supabase, user, options = {}) {
  const userId = user.id;
  const authProvider = user.app_metadata?.provider || 'email';
  const accountAge = checkAccountAge(user);

  const results = {
    storage: null,
    tokens: null,
    userTable: null,
    auditLog: null,
    signOut: null,
  };

  try {
    // 1. Log deletion (optional audit log)
    results.auditLog = await logAccountDeletion(supabase, userId, {
      reason: options.reason,
      authProvider,
      accountAgeHours: accountAge.hoursSinceCreation,
    });

    // 2. Delete profile picture from storage
    results.storage = await deleteProfilePicture(supabase, userId);

    // 3. Delete OAuth tokens
    results.tokens = await deleteOAuthTokens(supabase, userId);

    // 4. Delete user from users table
    // Note: Related data (privacy settings, notification preferences, etc.)
    // will be deleted via CASCADE DELETE from foreign key constraints
    results.userTable = await deleteUserFromTable(supabase, userId);

    // 5. Sign out user
    results.signOut = await signOutUser(supabase);

    // Check if any critical operations failed
    const criticalFailures = [
      results.userTable?.success === false,
      results.signOut?.success === false,
    ].some(Boolean);

    return {
      success: !criticalFailures,
      deleted: results,
      authProvider,
      accountAge: accountAge.hoursSinceCreation,
    };
  } catch (error) {
    console.error('[accountDeletion] Account deletion error:', error);
    return {
      success: false,
      deleted: results,
      error: error.message,
    };
  }
}

/**
 * Validate account deletion request
 * @param {Object} user - User object from auth
 * @param {Object} requestBody - Request body from API
 * @returns {Object} { valid: boolean, error?: string, data?: Object }
 */
export function validateDeletionRequest(user, requestBody) {
  // Check required fields
  if (!requestBody.password) {
    return { valid: false, error: 'Password is required' };
  }

  if (!requestBody.confirmation_phrase || requestBody.confirmation_phrase !== 'DELETE MY ACCOUNT') {
    return { valid: false, error: 'Confirmation phrase does not match' };
  }

  // Check account age
  const accountAge = checkAccountAge(user);
  if (!accountAge.isOldEnough) {
    return {
      valid: false,
      error: 'Account too new',
      message: 'Accounts less than 24 hours old cannot be deleted for security purposes',
      hoursRemaining: accountAge.hoursRemaining,
    };
  }

  return {
    valid: true,
    data: {
      password: requestBody.password,
      confirmationPhrase: requestBody.confirmation_phrase,
      reason: requestBody.reason || null,
    },
  };
}


