/**
 * Global Song Database Service
 * A shared knowledge base that grows as users interact with the app.
 */

import { supabaseServer } from '@/lib/supabase/server';
import { parseWithAI, batchParseWithAI } from './aiTitleParser';
import { parseYouTubeTitle } from '@/lib/utils/youtubeParser';

// In-memory cache for hot lookups (speeds up repeated queries during a session)
// NOTE: Database storage is PERMANENT - this is just for performance within a session
const memoryCache = new Map();
const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for in-memory only
const MEMORY_CACHE_MAX = 500;

function generateSearchKey(title, artist) {
  const t = (title || '').toLowerCase().trim().replace(/[^\w\s]/g, '');
  const a = (artist || '').toLowerCase().trim().replace(/[^\w\s]/g, '');
  return `${a}:${t}`;
}

function checkCache(key) {
  const c = memoryCache.get(key);
  return (c && Date.now() - c.ts < MEMORY_CACHE_TTL) ? c.data : null;
}

function addCache(key, data) {
  memoryCache.set(key, { data, ts: Date.now() });
  if (memoryCache.size > MEMORY_CACHE_MAX) {
    const oldest = Array.from(memoryCache.entries()).sort((a, b) => a[1].ts - b[1].ts)[0];
    memoryCache.delete(oldest[0]);
  }
}

export async function lookupSong({ title, artist, spotifyId, youtubeId }) {
  const cacheKey = spotifyId || youtubeId || generateSearchKey(title, artist);
  const cached = checkCache(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  try {
    const supabase = supabaseServer();
    
    if (spotifyId) {
      const { data, error } = await supabase.from('global_songs').select('*').eq('spotify_id', spotifyId).single();
      if (error && (error.message?.includes('does not exist') || error.code === '42P01')) {
        // Table doesn't exist yet - silently return null
        return null;
      }
      if (data) { addCache(cacheKey, data); return data; }
    }
    
    if (youtubeId) {
      const { data, error } = await supabase.from('global_songs').select('*').eq('youtube_id', youtubeId).single();
      if (error && (error.message?.includes('does not exist') || error.code === '42P01')) {
        return null;
      }
      if (data) { addCache(cacheKey, data); return data; }
    }
    
    if (title && artist) {
      const st = title.toLowerCase().trim();
      const sa = artist.toLowerCase().trim();
      const { data, error } = await supabase.from('global_songs').select('*')
        .or(`canonical_title.ilike.${st},parsed_title.ilike.${st}`)
        .limit(1).single();
      if (error && (error.message?.includes('does not exist') || error.code === '42P01')) {
        return null;
      }
      if (data) { addCache(cacheKey, data); return data; }
    }
    
    return null;
  } catch (e) {
    // Silently handle table not existing
    if (e.message?.includes('does not exist') || e.message?.includes('42P01')) {
      return null;
    }
    console.error('[globalSongDB] Lookup error:', e.message);
    return null;
  }
}

export async function registerSong({ originalTitle, originalArtist, spotifyId, youtubeId, channelName, genres = [], popularity = 0, audioFeatures = {}, album = null }) {
  try {
    const supabase = supabaseServer();
    const existing = await lookupSong({ title: originalTitle, artist: originalArtist, spotifyId, youtubeId });
    
    if (existing) {
      const updates = {};
      if (spotifyId && !existing.spotify_id) updates.spotify_id = spotifyId;
      if (youtubeId && !existing.youtube_id) updates.youtube_id = youtubeId;
      if (genres?.length && !existing.genres?.length) updates.genres = genres;
      if (popularity > existing.popularity) updates.popularity = popularity;
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('global_songs').update(updates).eq('id', existing.id);
        if (error && (error.message?.includes('does not exist') || error.code === '42P01')) {
          return null; // Table doesn't exist
        }
      }
      return { ...existing, ...updates, alreadyExists: true };
    }

    let parsedTitle = originalTitle, parsedArtist = originalArtist || channelName;
    if (!originalArtist) {
      try {
        const p = await parseWithAI(originalTitle, channelName);
        parsedTitle = p.title || originalTitle;
        parsedArtist = p.artist || channelName || 'Unknown';
      } catch (e) {
        const h = parseYouTubeTitle(originalTitle, channelName);
        parsedTitle = h.title; parsedArtist = h.artist;
      }
    }

    let qScore = 10;
    if (spotifyId) qScore += 30;
    if (genres?.length) qScore += 20;
    if (popularity > 0) qScore += 10;
    qScore = Math.min(100, qScore);

    const { data, error } = await supabase.from('global_songs').insert({
      original_title: originalTitle, original_artist: originalArtist,
      parsed_title: parsedTitle, parsed_artist: parsedArtist,
      canonical_title: parsedTitle, canonical_artist: parsedArtist,
      spotify_id: spotifyId, youtube_id: youtubeId,
      genres, popularity, audio_features: audioFeatures, album,
      metadata_sources: spotifyId ? ['spotify'] : youtubeId ? ['youtube'] : ['user'],
      metadata_quality_score: qScore,
    }).select().single();

    if (error) {
      // Handle table not existing gracefully
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.log('[globalSongDB] Table does not exist yet, skipping registration');
        return null;
      }
      throw error;
    }
    
    // Add alias (ignore if alias table doesn't exist)
    await supabase.from('song_aliases').insert({
      global_song_id: data.id, alias_title: originalTitle, alias_artist: originalArtist, alias_type: 'user_input'
    }).catch(() => {}); // Silently ignore alias errors

    console.log(`[globalSongDB] ✅ Registered: "${parsedArtist} - ${parsedTitle}"`);
    return data;
  } catch (e) {
    // Silently handle table not existing
    if (e.message?.includes('does not exist') || e.message?.includes('42P01')) {
      return null;
    }
    console.error('[globalSongDB] Register error:', e);
    return null;
  }
}

export async function batchRegisterSongs(songs) {
  if (!songs?.length) return [];
  
  try {
    const supabase = supabaseServer();
    const results = [];
    const existing = await Promise.all(songs.map(s => lookupSong({ title: s.originalTitle, artist: s.originalArtist, spotifyId: s.spotifyId, youtubeId: s.youtubeId })));
    
    const newSongs = [], newIdx = [];
    for (let i = 0; i < songs.length; i++) {
      if (existing[i]) results[i] = { ...existing[i], alreadyExists: true };
      else { newSongs.push(songs[i]); newIdx.push(i); }
    }
    
    if (!newSongs.length) return results;
    
    const needsParsing = newSongs.filter(s => !s.originalArtist && s.originalTitle).map(s => ({ title: s.originalTitle, channelName: s.channelName }));
    const parsed = needsParsing.length ? await batchParseWithAI(needsParsing) : [];
    
    let pi = 0;
    const inserts = newSongs.map(s => {
      let pt = s.originalTitle, pa = s.originalArtist || s.channelName || 'Unknown';
      if (!s.originalArtist && s.originalTitle && parsed[pi]) {
        pt = parsed[pi].title || s.originalTitle;
        pa = parsed[pi].artist || s.channelName || 'Unknown';
        pi++;
      }
      return {
        original_title: s.originalTitle, original_artist: s.originalArtist,
        parsed_title: pt, parsed_artist: pa,
        canonical_title: pt, canonical_artist: pa,
        spotify_id: s.spotifyId, youtube_id: s.youtubeId,
        genres: s.genres || [], popularity: s.popularity || 0,
        audio_features: s.audioFeatures || {}, album: s.album,
        metadata_sources: s.spotifyId ? ['spotify'] : s.youtubeId ? ['youtube'] : ['user'],
        metadata_quality_score: Math.min(100, 10 + (s.spotifyId ? 30 : 0) + (s.genres?.length ? 20 : 0)),
      };
    });

    const { data: ins, error } = await supabase.from('global_songs').insert(inserts).select();
    
    // Handle table not existing
    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.log('[globalSongDB] Table does not exist yet, skipping batch registration');
        return songs.map(() => null);
      }
      // Try individual inserts as fallback
      for (let i = 0; i < newSongs.length; i++) results[newIdx[i]] = await registerSong(newSongs[i]);
      return results;
    }
    
    for (let i = 0; i < ins.length; i++) results[newIdx[i]] = ins[i];
    console.log(`[globalSongDB] ✅ Batch registered ${ins.length} songs`);
    return results;
  } catch (e) {
    // Silently handle table not existing
    if (e.message?.includes('does not exist') || e.message?.includes('42P01')) {
      console.log('[globalSongDB] Table does not exist yet, skipping batch registration');
      return songs.map(() => null);
    }
    console.error('[globalSongDB] Batch register error:', e);
    return songs.map(() => null);
  }
}

export async function updateSongMetadata(songId, updates) {
  try {
    const supabase = supabaseServer();
    await supabase.from('global_songs').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', songId);
    return true;
  } catch (e) { return false; }
}

export async function addSongAlias(songId, title, artist, type = 'user_input') {
  try {
    const supabase = supabaseServer();
    await supabase.from('song_aliases').insert({ global_song_id: songId, alias_title: title, alias_artist: artist, alias_type: type });
    return true;
  } catch (e) { return false; }
}

export async function getDatabaseStats() {
  try {
    const supabase = supabaseServer();
    const [totalRes, wGenresRes, wSpotifyRes, wYoutubeRes] = await Promise.all([
      supabase.from('global_songs').select('*', { count: 'exact', head: true }),
      supabase.from('global_songs').select('*', { count: 'exact', head: true }).not('genres', 'eq', '{}'),
      supabase.from('global_songs').select('*', { count: 'exact', head: true }).not('spotify_id', 'is', null),
      supabase.from('global_songs').select('*', { count: 'exact', head: true }).not('youtube_id', 'is', null),
    ]);
    
    // Check if table doesn't exist
    if (totalRes.error && (totalRes.error.message?.includes('does not exist') || totalRes.error.code === '42P01')) {
      return { total: 0, tableNotFound: true };
    }
    
    const total = totalRes.count || 0;
    const wGenres = wGenresRes.count || 0;
    const wSpotify = wSpotifyRes.count || 0;
    const wYoutube = wYoutubeRes.count || 0;
    
    return { total, wGenres, wSpotify, wYoutube, coverage: total > 0 ? ((wGenres / total) * 100).toFixed(1) : 0 };
  } catch (e) {
    if (e.message?.includes('does not exist') || e.message?.includes('42P01')) {
      return { total: 0, tableNotFound: true };
    }
    return { total: 0 };
  }
}

export default { lookupSong, registerSong, batchRegisterSongs, updateSongMetadata, addSongAlias, getDatabaseStats };

