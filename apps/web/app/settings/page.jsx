'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      router.push('/sign-in');
      return;
    }

    setUser(session.user);
    setProvider(session.user?.app_metadata?.provider || 'unknown');
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/sign-in');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-white"></div>
          <p className="text-gray-400 text-sm sm:text-base">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <header className="mb-4 sm:mb-6">
          <h1 className="page-title text-xl sm:text-2xl mb-1">Settings</h1>
          <p className="section-subtitle text-xs sm:text-sm">Manage your account and preferences</p>
        </header>

        {user && (
          <div className="mb-6 glass-card rounded-2xl p-6 transition-colors hover:bg-white/5">
            <h2 className="text-xl font-semibold mb-2">Account</h2>
            <p className="text-gray-400">Email: {user.email}</p>
            <p className="text-gray-400 capitalize">Logged in with: {provider}</p>
            <button
              onClick={signOut}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md"
            >
              Log Out
            </button>
          </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          <h2 className="section-title text-lg sm:text-xl">About Your Login</h2>

          <div className="glass-card rounded-2xl p-6 transition-colors hover:bg-white/5">
            <p className="text-gray-300">
              You're logged in using <span className="text-white font-semibold capitalize">{provider}</span>.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Your {provider} account is used for authentication and accessing your music library.
            </p>
          </div>

          {provider === 'google' && (
            <div className="glass-card rounded-2xl p-4 border border-blue-500/40 transition-colors hover:bg-white/5">
              <p className="text-sm text-blue-200">
                With YouTube (Google) login, you have access to your YouTube playlists and history.
              </p>
            </div>
          )}

          {provider === 'spotify' && (
            <div className="glass-card rounded-2xl p-4 border border-green-500/40 transition-colors hover:bg-white/5">
              <p className="text-sm text-green-200">
                With Spotify login, you have access to your Spotify playlists and recently played tracks.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
