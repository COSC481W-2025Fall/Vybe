'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

export default function SignInPage() {
  const supabase = supabaseBrowser();

  const signInWithSpotify = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: `${location.origin}/auth/callback?next=/library`,
        scopes: 'user-read-email user-read-private playlist-read-private user-read-recently-played',
      },
      queryParams: { show_dialog: 'true' },
    });
    if (error) console.error('Spotify login error:', error.message);
  };

  const signInWithYouTube = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback?next=/library`,
        scopes: [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/youtube.readonly',
        ].join(' '),
      },
    });
    if (error) console.error('Google/YouTube login error:', error.message);
  };

  return (
    <div className="p-6 flex flex-col justify-center items-center h-80 w-fit bg-[#000000] rounded-lg glow-shadow--soft p-6 bg-black rounded-lg border border-white/40" id="login-box">
      <div className="flex flex-col items-center">
        <h1 className="text-3xl mb-3 bg-[linear-gradient(90deg,#8b5cf6,#ec4899,#f59e0b,#10b981,#3b82f6)] bg-clip-text text-transparent [background-size:300%_300%] animate-[gradient-move_8s_linear_infinite]">Welcome to Vybe</h1>
        <h2 className="mb-8 text-[#6A6A6A]">Connect with friends and share your musical journey</h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-0.5 w-20 bg-gray-600"></div>
        <button
          onClick={signInWithSpotify}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground bg-[#00A63E] text-amber-50 hover:bg-green-900"
        >
          Continue with Spotify
        </button>
        <button
          onClick={signInWithYouTube}
          className="rounded-md px-4 py-2 bg-white text-black hover:bg-gray-200"
        >
          Continue with YouTube
        </button>
        <div className="h-0.5 w-20 bg-[#6A6A6A]"></div>
      </div>
    </div>
  );
}
