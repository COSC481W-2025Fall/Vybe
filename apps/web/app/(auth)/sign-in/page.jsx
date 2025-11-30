'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Music } from 'lucide-react';

export default function SignInPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/library');
      }
    }
    checkAuth();
  }, [router]);

  const signInWithSpotify = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: `${location.origin}/auth/callback?next=/library&provider=spotify`,
        scopes: 'user-read-email user-read-private playlist-read-private user-read-recently-played',
      },
      queryParams: { show_dialog: 'true' },
    });
    if (error) console.error('Spotify login error:', error.message);
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback?next=/library&provider=google`,
        scopes: [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/youtube.readonly',
          'https://www.googleapis.com/auth/youtube.force-ssl', // Allow playlist creation
        ].join(' '),
      },
    });
    if (error) console.error('Google/YouTube login error:', error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 dark">
      <div className="w-full max-w-md glass-card rounded-lg p-6 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-md icon-glow-pulse"></div>
              <div className="glass-card rounded-full p-3 sm:p-4 relative backdrop-blur-xl bg-white/10 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]">
                <Music className="h-6 w-6 sm:h-8 sm:w-8 text-white relative z-10" />
              </div>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl chroma-text-gradient font-semibold mb-2 px-2">Welcome to Vybe</h1>
          <p className="text-gray-400 text-xs sm:text-sm px-2">Connect with friends and share your musical journey</p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <button
            onClick={signInWithSpotify}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 sm:py-3.5 bg-[#1DB954] hover:bg-[#1ed760] active:bg-[#1aa34a] text-white rounded-md transition-colors font-medium text-sm sm:text-base touch-manipulation"
            data-testid="spotify-signin"
          >
            <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.48.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.301z"/>
            </svg>
            <span>Continue with Spotify</span>
          </button>
          
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 sm:py-3.5 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 rounded-md transition-colors font-medium border border-gray-300 text-sm sm:text-base touch-manipulation"
            data-testid="google-signin"
          >
            <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
}
