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
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        {user && (
          <div className="mb-8 p-4 bg-muted rounded-lg border border-border">
            <h2 className="text-xl font-semibold mb-2">Account</h2>
            <p className="text-muted-foreground">Email: {user.email}</p>
            <p className="text-muted-foreground capitalize">Logged in with: {provider}</p>
            <button
              onClick={signOut}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-md transition-colors"
            >
              Log Out
            </button>
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">About Your Login</h2>

          <div className="p-6 bg-muted rounded-lg border border-border">
            <p className="text-foreground">
              You're logged in using <span className="font-semibold capitalize">{provider}</span>.
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Your {provider} account is used for authentication and accessing your music library.
            </p>
          </div>

          {provider === 'google' && (
            <div className="p-4 bg-blue-500/10 dark:bg-blue-900/30 border border-blue-500/30 dark:border-blue-500/50 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-200">
                With YouTube (Google) login, you have access to your YouTube playlists and history.
              </p>
            </div>
          )}

          {provider === 'spotify' && (
            <div className="p-4 bg-green-500/10 dark:bg-green-900/30 border border-green-500/30 dark:border-green-500/50 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-200">
                With Spotify login, you have access to your Spotify playlists and recently played tracks.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
