export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const userId = "u-fahd"; // change if needed

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Light, theme-aware card */}
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-md p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Your Library</h1>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            Library content goes here. (Spotify can be wired later.)
          </p>
        </div>

        {/* Friend Recs CTA */}
        <div className="rounded-2xl border border-violet-100 dark:border-white/10 bg-white/90 dark:bg-white/10 backdrop-blur-md p-5 shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Friend Recommendations</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            See tracks boosted by your friends.
          </p>
          <div className="mt-3">
            <a
              href={`/recs/${encodeURIComponent(userId)}`}
              className="inline-block rounded-lg px-4 py-2 text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition"
            >
              View Recs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}