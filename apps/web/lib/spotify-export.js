/**
 * Helpers for building Spotify payloads for export/import operations.
 * Kept small and unit-testable.
 */

/**
 * Convert an array of track objects or ids to Spotify track URIs preserving order.
 * Accepts either strings (ids) or objects with `.id` property.
 * Filters out invalid/missing ids.
 */
export function buildTrackUris(tracks) {
  if (!Array.isArray(tracks)) return [];
  const uris = [];
  for (const t of tracks) {
    const id = typeof t === 'string' ? t : (t && (t.id || t.track?.id));
    if (id) uris.push(`spotify:track:${id}`);
  }
  return uris;
}

export function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
