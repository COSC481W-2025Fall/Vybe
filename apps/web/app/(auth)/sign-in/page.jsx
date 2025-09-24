'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * SignInPage Component
 * 
 * This component provides authentication options for users to sign in to Vybe.
 * It supports multiple OAuth providers:
 * - Spotify: For music-related features and playlists
 * - Google: For general authentication and YouTube access
 * 
 * Features:
 * - Clean, modern UI with gradient animations
 * - Provider-specific OAuth flows
 * - Automatic redirect after successful authentication
 * - Error handling for failed login attempts
 */
export default function SignInPage() {
  const supabase = supabaseBrowser();

  /**
   * Handle Spotify OAuth sign-in
   * This function initiates the Spotify OAuth flow with the required scopes
   * for accessing user's music data and playlists
   */
  const signInWithSpotify = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'spotify',
        options: {
          redirectTo: `${location.origin}/auth/callback?next=/library`,
          scopes: 'user-read-email user-read-private playlist-read-private user-read-recently-played',
        },
        queryParams: { show_dialog: 'true' },
      });
      
      if (error) {
        console.error('Spotify login error:', error.message);
        // TODO: Show user-friendly error message
      }
    } catch (error) {
      console.error('Unexpected error during Spotify login:', error);
    }
  };

  /**
   * Handle Google OAuth sign-in
   * This function initiates the Google OAuth flow with scopes for accessing
   * user's basic profile information and YouTube data
   */
  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${location.origin}/auth/callback?next=/library`,
          scopes: 'openid email profile https://www.googleapis.com/auth/youtube.readonly',
        },
        queryParams: { 
          access_type: 'offline',
          prompt: 'consent' // Force consent screen to get refresh token
        },
      });
      
      if (error) {
        console.error('Google login error:', error.message);
        // TODO: Show user-friendly error message
      }
    } catch (error) {
      console.error('Unexpected error during Google login:', error);
    }
  };

  return (
    <div className="p-6 flex flex-col justify-center items-center h-80 w-fit bg-[#000000] rounded-lg glow-shadow--soft p-6 bg-black rounded-lg border border-white/40" id="login-box">
      {/* Header Section */}
      <div className="flex flex-col items-center">
        <h1 className="text-3xl mb-3 bg-[linear-gradient(90deg,#8b5cf6,#ec4899,#f59e0b,#10b981,#3b82f6)] bg-clip-text text-transparent [background-size:300%_300%] animate-[gradient-move_8s_linear_infinite]">
          Welcome to Vybe
        </h1>
        <h2 className="mb-8 text-[#6A6A6A]">Connect with friends and share your musical journey</h2>
      </div>
      
      {/* Authentication Buttons */}
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Spotify Sign-in Button */}
        <div className="flex items-center gap-3 w-full">
          <div className="h-0.5 w-20 bg-gray-600"></div>
          <button
            onClick={signInWithSpotify}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-primary-foreground bg-[#00A63E] text-amber-50 hover:bg-green-900 transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Continue with Spotify
          </button>
          <div className="h-0.5 w-20 bg-[#6A6A6A]"></div>
        </div>

        {/* Divider */}
        <div className="flex items-center w-full">
          <div className="flex-1 h-px bg-gray-600"></div>
          <span className="px-3 text-sm text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-600"></div>
        </div>

        {/* Google Sign-in Button */}
        <div className="flex items-center gap-3 w-full">
          <div className="h-0.5 w-20 bg-gray-600"></div>
          <button
            onClick={signInWithGoogle}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-primary-foreground bg-white text-gray-800 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center gap-2 border border-gray-300"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
          <div className="h-0.5 w-20 bg-[#6A6A6A]"></div>
        </div>
      </div>
    </div>
  );
}
