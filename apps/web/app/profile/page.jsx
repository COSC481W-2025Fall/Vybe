'use client';

import { useMemo } from 'react';
import { User, Calendar, Mail, Music, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { useProfile } from '@/hooks/useProfileUpdate';

export default function ProfilePage() {
  const { data: profile, isLoading, error } = useProfile();

  const joinedText = useMemo(() => {
    if (!profile?.created_at) return 'N/A';
    const d = new Date(profile.created_at);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [profile?.created_at]);

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[var(--foreground)]"></div>
          <p className="text-[var(--muted-foreground)] text-sm sm:text-base">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-red-300">
            Failed to load profile: {error.message || 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || 'No name set';
  const email = profile.email || 'N/A';
  const username = profile.username ? `@${profile.username}` : null;
  const avatarUrl = profile.profile_picture_url || null;

  return (
    <div className="min-h-screen text-[var(--foreground)]">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-6 sm:space-y-8">
        {/* Header / Title */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <User className="h-7 w-7 text-purple-400" />
            <div>
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">Your Profile</h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                This is how your Vybe profile looks.
              </p>
            </div>
          </div>

          <Link
            href="/settings/profile"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
          >
            <SettingsIcon className="h-4 w-4" />
            Edit Profile
          </Link>
        </div>

        {/* Main Profile Card */}
        <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center gap-6">
          {/* Avatar: use profile picture if available, otherwise initial */}
          <div className="h-20 w-20 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">{displayName}</h2>
              {username && (
                <span className="text-sm text-[var(--muted-foreground)]">{username}</span>
              )}
            </div>

            {profile.bio && (
              <p className="text-sm text-[var(--muted-foreground)] max-w-xl">{profile.bio}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-[var(--muted-foreground)] mt-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>{email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Joined {joinedText}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Simple stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 flex items-center gap-3">
            <Music className="h-5 w-5 text-pink-400" />
            <div>
              <div className="text-sm text-[var(--muted-foreground)]">Song Today</div>
              <div className="text-lg font-semibold text-[var(--foreground)]">0</div>
            </div>
          </div>
          <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 flex items-center gap-3">
            <User className="h-5 w-5 text-blue-400" />
            <div>
              <div className="text-sm text-[var(--muted-foreground)]">Groups</div>
              <div className="text-lg font-semibold text-[var(--foreground)]">0</div>
            </div>
          </div>
          <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 flex items-center gap-3">
            <User className="h-5 w-5 text-red-400" />
            <div>
              <div className="text-sm text-[var(--muted-foreground)]">Friends</div>
              <div className="text-lg font-semibold text-[var(--foreground)]">0</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
