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
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <section className="mx-auto px-6 py-8 text-white">
      <div className="max-w-2xl mx-auto">
        <h1 className="page-title mb-6">Settings</h1>

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

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">About Your Login</h2>

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
    </section>
  );
}
