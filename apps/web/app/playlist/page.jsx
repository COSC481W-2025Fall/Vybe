'use client';

export default function PlaylistPage() {
  return (
    <div className="min-h-screen text-[var(--foreground)]">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <header className="mb-4 sm:mb-6">
          <h1 className="page-title text-xl sm:text-2xl mb-1">Playlists</h1>
          <p className="section-subtitle text-xs sm:text-sm">Feature coming soon</p>
        </header>
        <div className="glass-card rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center text-[var(--foreground)]">
          <div className="mx-auto h-32 w-32 rounded-full bg-white/5 [data-theme='light']:bg-black/5 border border-white/10 [data-theme='light']:border-black/10 flex items-center justify-center">
            <span className="text-lg text-[var(--muted-foreground)]">♪</span>
          </div>
        </div>
      </div>
    </div>
  );
}


