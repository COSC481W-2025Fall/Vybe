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
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        {user && (
          <div className="mb-8 p-4 bg-gray-900 rounded-lg">
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

          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <p className="text-gray-300">
              You're logged in using <span className="text-white font-semibold capitalize">{provider}</span>.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Your {provider} account is used for authentication and accessing your music library.
            </p>
          </div>

          {provider === 'google' && (
            <div className="p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg">
              <p className="text-sm text-blue-200">
                With YouTube (Google) login, you have access to your YouTube playlists and history.
              </p>
            </div>
          )}

          {provider === 'spotify' && (
            <div className="p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
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
