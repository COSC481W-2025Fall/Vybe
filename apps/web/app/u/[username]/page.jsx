'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { User, Lock, AlertCircle, Music } from 'lucide-react';

export default function PublicProfilePage() {
  const pathname = usePathname();

  // Normalize username from URL (lowercase)
  const username = (pathname?.split('/').pop() || '').toLowerCase();

  const [state, setState] = useState({
    loading: true,
    error: null,
    private: false,
    profile: null,
  });

  useEffect(() => {
    if (!username) return;

    let isMounted = true;

    async function loadProfile() {
      try {
        const url = `/api/public-profile/${encodeURIComponent(username)}`;
        console.log('[PublicProfile] Fetching:', url);

        const res = await fetch(url);

        if (!isMounted) return;

        console.log('[PublicProfile] status:', res.status);

        if (res.status === 403) {
          setState({
            loading: false,
            error: null,
            private: true,
            profile: null,
          });
          return;
        }

        if (!res.ok) {
          setState({
            loading: false,
            error: 'Profile not found',
            private: false,
            profile: null,
          });
          return;
        }

        const data = await res.json();
        console.log('[PublicProfile] data:', data);

        setState({
          loading: false,
          error: null,
          private: false,
          profile: data.profile,
        });
      } catch (err) {
        console.error('[PublicProfile] error', err);
        if (!isMounted) return;
        setState({
          loading: false,
          error: 'Something went wrong loading this profile',
          private: false,
          profile: null,
        });
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [username]);

  const { loading, error, private: isPrivate, profile } = state;

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-300">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
          <p>Loading profile…</p>
        </div>
      </div>
    );
  }

  // Private
  if (isPrivate) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full glass-card rounded-2xl p-6 border border-white/10 text-center">
          <div className="flex justify-center mb-3">
            <Lock className="h-10 w-10 text-yellow-400" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">
            This profile is private
          </h1>
          <p className="text-sm text-gray-400">
            {username ? `@${username}` : 'This user'} has restricted access to their profile.
          </p>
        </div>
      </div>
    );
  }

  // Error / not found
  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full glass-card rounded-2xl p-6 border border-red-500/30 text-center">
          <div className="flex justify-center mb-3">
            <AlertCircle className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text.white mb-2">
            Profile not found
          </h1>
          <p className="text-sm text-gray-400">
            {error || 'We could not find this user.'}
          </p>
        </div>
      </div>
    );
  }

  // Public profile view
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-xl w-full glass-card rounded-2xl p-6 border border.white/10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative h-16 w-16 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
            {profile.profile_picture_url ? (
              <Image
                src={profile.profile_picture_url}
                alt={profile.display_name || profile.username}
                fill
                className="object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-gray-300" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-sm text-gray-400">@{profile.username}</p>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-1">Bio</h2>
            <p className="text-sm text-gray-200 whitespace-pre-line">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-white/10 pt-4 mt-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Music className="h-4 w-4" />
            <span>This is a public Vybe profile.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
