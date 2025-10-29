import { headers } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function RecsPage({ params }) {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const url = `${proto}://${host}/api/recs/${encodeURIComponent(params.userId)}`;

  const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text();
    return (
      <div className="min-h-screen px-6 py-8 flex items-center justify-center">
        <div className="w-full max-w-2xl rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-md p-6 shadow-sm">
          <h1 className="text-2xl font-medium text-gray-700 dark:text-gray-300">
            Friend Recommendations
          </h1>
          <p className="mt-2 text-red-600 dark:text-red-400">
            Failed to load recommendations.
          </p>
          <pre className="mt-3 text-xs text-gray-800 dark:text-gray-300 bg-black/5 dark:bg-white/5 p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
            {text}
          </pre>
        </div>
      </div>
    );
  }

  const data = await res.json();
  const recs = Array.isArray(data)
    ? data
    : Array.isArray(data?.recommendations)
    ? data.recommendations
    : [];
  const userId = data?.user_id ?? params.userId;

  if (!recs.length) {
    return (
      <div className="min-h-screen px-6 py-8 flex items-center justify-center">
        <div className="w-full max-w-md text-center rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-md p-8 shadow-sm">
          <h1 className="text-2xl font-medium text-gray-700 dark:text-gray-300">
            Friend Recommendations
          </h1>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            No friend-based tracks yet.
          </p>
        </div>
      </div>
    );
  }

  const spotifyUrl = (trackId) => `https://open.spotify.com/track/${trackId}`;

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-medium text-gray-700 dark:text-gray-300">
          Friend Recommendations
        </h1>

        <ul className="mt-6 space-y-4">
          {recs.map((r) => (
            <li
              key={r.track_id}
              className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-md p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <a
                className="font-medium underline underline-offset-2 decoration-2 text-violet-700 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200"
                href={spotifyUrl(r.track_id)}
                target="_blank"
                rel="noreferrer"
              >
                {r.track_id}
              </a>
              <div className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                Score: {Number(r.score).toFixed(2)} • Plays: {r.play_count}
              </div>
              {Array.isArray(r.contributing_friends) && r.contributing_friends.length ? (
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  From: {r.contributing_friends.join(", ")}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
