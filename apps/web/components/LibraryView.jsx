'use client';

import { useMemo, useState } from 'react';
import { Clock, ListMusic } from 'lucide-react';

// --- sample data (replace with real data later) ---
const RECENT = [
  {
    id: 1,
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    cover: 'https://picsum.photos/seed/blinding/80/80',
    playedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  },
  {
    id: 2,
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    cover: 'https://picsum.photos/seed/levitating/80/80',
    playedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
  },
  {
    id: 3,
    title: 'Good 4 U',
    artist: 'Olivia Rodrigo',
    album: 'SOUR',
    cover: 'https://picsum.photos/seed/good4u/80/80',
    playedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
  },
];

const TABS = [
  { key: 'recent', label: 'Recent History' },
  { key: 'saved',  label: 'Saved Playlists' },
];

// --- helpers ---
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
        <div className="truncate text-sm font-medium">{item.title}</div>
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

export default function LibraryView() {
  const [tab, setTab] = useState('recent');

  const content = useMemo(() => {
    if (tab === 'recent') {
      return (
        <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-xl backdrop-blur chroma-card">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Recent Listening History</span>
          </div>
          <ul className="divide-y divide-border/60">
            {RECENT.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </ul>
        </div>
      );
    }
    // Saved playlists placeholder
    return (
      <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-xl backdrop-blur chroma-card">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <ListMusic className="h-4 w-4 text-muted-foreground" />
          <span>Saved Playlists</span>
        </div>
        <p className="text-sm text-muted-foreground">
          You don’t have any saved playlists yet.
        </p>
      </div>
    );
  }, [tab]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Your Library</h1>
        <p className="text-sm text-muted-foreground">
          Your listening history and saved playlists
        </p>
      </header>

      <div className="mb-4 flex items-center gap-2">
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
