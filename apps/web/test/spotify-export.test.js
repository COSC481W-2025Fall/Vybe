import { describe, it, expect } from 'vitest';
import { buildTrackUris, chunkArray } from '../lib/spotify-export';

describe('spotify-export helpers', () => {
  it('buildTrackUris: preserves order and skips invalid', () => {
    const input = [
      { id: 'AAA' },
      'BBB',
      { track: { id: 'CCC' } },
      { id: null },
      {},
    ];
    const out = buildTrackUris(input);
    expect(out).toEqual(['spotify:track:AAA', 'spotify:track:BBB', 'spotify:track:CCC']);
  });

  it('chunkArray: splits into batches', () => {
    const arr = [1,2,3,4,5,6,7];
    const chunks = chunkArray(arr, 3);
    expect(chunks.length).toBe(3);
    expect(chunks[0]).toEqual([1,2,3]);
    expect(chunks[1]).toEqual([4,5,6]);
    expect(chunks[2]).toEqual([7]);
  });
});
