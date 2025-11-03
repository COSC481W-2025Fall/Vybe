// lib/getUserProvider.js
import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Get the music provider (spotify or google) that the user last logged in with.
 * This checks the database's last_used_provider field which is set during OAuth callback.
 *
 * @returns {Promise<'spotify' | 'google' | null>} The provider the user is using
 */
export async function getUserProvider() {
  try {
    const supabase = supabaseBrowser();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[getUserProvider] No authenticated user');
      return null;
    }

    // Check database for last_used_provider
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('last_used_provider')
      .eq('id', user.id)
      .maybeSingle();

    if (dbError) {
      console.error('[getUserProvider] Database error:', dbError);
      return null;
    }

    const provider = userData?.last_used_provider;
    console.log('[getUserProvider] User provider:', provider);

    // Fallback: check which providers are linked
    if (!provider) {
      const identities = user.identities || [];
      const hasGoogle = identities.some(id => id.provider === 'google');
      const hasSpotify = identities.some(id => id.provider === 'spotify');

      if (hasSpotify && !hasGoogle) return 'spotify';
      if (hasGoogle && !hasSpotify) return 'google';

      // If both or neither, default to spotify
      return 'spotify';
    }

    return provider;
  } catch (error) {
    console.error('[getUserProvider] Error:', error);
    return null;
  }
}
