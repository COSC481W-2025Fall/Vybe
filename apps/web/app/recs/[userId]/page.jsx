export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function RecsPage({ params }) {
  const base = (process.env.FASTAPI_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  const url = `${base}/recs/${encodeURIComponent(params.userId)}`;

  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Backend ${url} -> HTTP ${res.status}. Body: ${body.slice(0,200)}`);
  }

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const body = await res.text().catch(() => '');
    throw new Error(`Expected JSON from ${url} but got "${ct}". Body: ${body.slice(0,200)}`);
  }

  const data = await res.json();
  const recs = Array.isArray(data)
    ? data
    : Array.isArray(data?.recommendations)
      ? data.recommendations
      : [];

  return (
    <main className="min-h-screen bg-black">
      <div className="mx-auto max-w-3xl p-6 text-gray-100">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-100 mb-6">
          Friend Recommendations
        </h1>

        {recs.length === 0 ? (
          <p className="text-gray-400">No recommendations found.</p>
        ) : (
          <ul className="space-y-4">
            {recs.map((r, idx) => (
              <li
                key={r.track_id ?? idx}
                className="rounded-2xl border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-900 transition-colors shadow-sm p-4"
              >
                <div className="font-semibold text-gray-100 break-all">
                  {r.track_name ?? r.track_id}
                </div>

                <div className="text-sm text-gray-400 mt-1">
                  score: {r.score} • plays: {r.play_count}
                </div>

                {r.track_id && (
                  <a
                    className="underline text-sm text-gray-200 hover:text-white mt-2 inline-block"
                    href={`https://open.spotify.com/track/${r.track_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Spotify
                  </a>
                )}

                {Array.isArray(r.contributing_friends) && r.contributing_friends.length > 0 && (
                  <div className="text-xs text-gray-500 mt-2">
                    friends: {r.contributing_friends.join(', ')}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
