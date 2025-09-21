'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { Clock, ListMusic } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { CONFIG } from '../config/constants.js';

// ---------------- helpers ----------------
function timeAgo(input) {
  const date = new Date(input);
  const diff = Math.max(0, Date.now() - date.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

// eslint-disable-next-line react/prop-types
function TabButton({ isActive, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-full px-3 py-1.5 text-sm transition',
        isActive
          ? 'bg-white text-black shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/* eslint-disable react/prop-types */
function Row({ item }) {
  return (
    <li className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-accent/30 transition">
      <img
        src={item.cover}
        width={48}
        height={48}
        className="h-12 w-12 rounded-md object-cover"
        alt={`${item.title} cover`}
      />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-white">{item.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {item.artist} • {item.album}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>{timeAgo(item.playedAt)}</span>
      </div>
    </li>
  );
}
/* eslint-enable react/prop-types */

// ---------------- component ----------------
const TABS = CONFIG.LIBRARY_TABS;

export default function LibraryView() {
  const [tab, setTab] = useState('recent');

  // Spotify identity
  const [spotifyMe, setSpotifyMe]   = useState(null);
  const [loadingMe, setLoadingMe]   = useState(true);
  const [meError, setMeError]       = useState(null);

  // Listening history
  const [recent, setRecent]         = useState([]);   // normalized items for UI
  const [loadingRec, setLoadingRec] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [recError, setRecError]     = useState(null);
  const [hasMore, setHasMore]       = useState(true); // we stop when Spotify returns empty

  // --- load Spotify identity (optional, nice UX) ---
  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: { user } } = await sb.auth.getUser();
        console.log('[Supabase user]', user);

        const res = await fetch('/api/spotify/me', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const me = await res.json();
        setSpotifyMe(me);
        setMeError(null);
      } catch (err) {
        console.error('Failed to load Spotify profile', err);
        setMeError(String(err?.message || err));
      } finally {
        setLoadingMe(false);
      }
    })();
  }, []);

  // --- helper: map Spotify API -> UI row ---
  const mapItem = useCallback((sp) => {
    const t = sp.track;
    return {
      id: `${t.id}-${sp.played_at}`, // unique per play
      title: t.name,
      artist: t.artists?.map(a => a.name).join(', ') || 'Unknown',
      album:  t.album?.name || '',
      cover:  t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || '',
      playedAt: sp.played_at,
    };
  }, []);

  // --- load first page of recently played ---
  useEffect(() => {
    (async () => {
      try {
        setLoadingRec(true);
        const res = await fetch('/api/spotify/me/player/recently-played?limit=20', { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status} ${body}`);
        }
        const json = await res.json();              // { items: [...], cursors, next }
        const items = (json.items || []).map(mapItem);
        setRecent(items);
        setHasMore((json.items || []).length > 0);
        setRecError(null);
      } catch (err) {
        console.error('Failed to load listening history', err);
        setRecError(String(err?.message || err));
      } finally {
        setLoadingRec(false);
      }
    })();
  }, [mapItem]);

  // --- load older history (uses "before" cursor = oldest played_at) ---
  const loadMore = useCallback(async () => {
    if (!recent.length) return;
    try {
      setMoreLoading(true);
      const oldest = recent[recent.length - 1];
      const beforeMs = new Date(oldest.playedAt).getTime(); // Spotify expects ms
      const url = `/api/spotify/me/player/recently-played?limit=20&before=${beforeMs}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${body}`);
      }
      const json = await res.json();
      const more = (json.items || []).map(mapItem);
      setRecent(prev => [...prev, ...more]);
      if (!json.items || json.items.length === 0) setHasMore(false);
    } catch (err) {
      console.error('Load more error', err);
      setRecError(String(err?.message || err));
    } finally {
      setMoreLoading(false);
    }
  }, [recent, mapItem]);

  const content = useMemo(() => {
    if (tab !== 'recent') {
      return (
        <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-xl backdrop-blur chroma-card text-white">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <ListMusic className="h-4 w-4 text-muted-foreground" />
            <span>Saved Playlists</span>
          </div>
          <p className="text-sm text-muted-foreground">
            You don’t have any saved playlists yet.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-xl backdrop-blur chroma-card mb-40 text-white">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>Recent Listening History</span>
        </div>

        {loadingRec && (
          <p className="text-xs text-muted-foreground">Loading your recent plays…</p>
        )}
        {recError && (
          <p className="text-xs text-red-500 break-all">{recError}</p>
        )}

        {!loadingRec && !recError && recent.length === 0 && (
          <p className="text-sm text-muted-foreground">No recent plays yet.</p>
        )}

        {recent.length > 0 && (
          <>
            <ul className="divide-y divide-border/60">
              {recent.map((it) => <Row key={it.id} item={it} />)}
            </ul>

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={moreLoading}
                  className="rounded-full px-4 py-1.5 text-sm bg-white text-black shadow-sm disabled:opacity-60"
                >
                  {moreLoading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }, [tab, recent, loadingRec, recError, hasMore, loadMore]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-white">Your Library</h1>
        <p className="text-sm text-muted-foreground text-white/80">
          Your listening history and saved playlists
        </p>

        {/* Spotify identity */}
        <div className="mt-3 flex items-center gap-3">
          {loadingMe && <span className="text-xs text-muted-foreground">Connecting to Spotify…</span>}
          {meError && <span className="text-xs text-red-500 break-all">{meError}</span>}
          {spotifyMe && (
            <>
              {spotifyMe.images?.[0]?.url && (
                <img
                  src={spotifyMe.images[0].url}
                  alt="Spotify avatar"
                  className="h-8 w-8 rounded-full object-cover"
                />
              )}
              <span className="text-sm text-white">
                Signed in as <span className="font-medium">{spotifyMe.display_name}</span>
              </span>
            </>
          )}
        </div>
      </header>

      <div className="mb-4 flex items-center gap-2 text-white">
        {TABS.map(({ key, label }) => (
          <TabButton key={key} isActive={tab === key} onClick={() => setTab(key)}>
            {label}
          </TabButton>
        ))}
      </div>

      {content}
    </section>
  );
}
