/**
 * Fallback Polling Service
 * 
 * When WebSocket connections fail, this provides a polling-based
 * fallback to keep data fresh.
 */

import { supabaseBrowser } from '@/lib/supabase/client';

// Polling intervals (ms)
const INTERVALS = {
  FAST: 5000,      // 5 seconds - for active views
  NORMAL: 15000,   // 15 seconds - for background
  SLOW: 60000,     // 1 minute - for inactive
};

class FallbackPollingService {
  constructor() {
    this.polls = new Map();
    this.isActive = true;
    this.visibility = 'visible';

    // Track page visibility
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.visibility = document.visibilityState;
        this.adjustIntervals();
      });
    }
  }

  /**
   * Start polling for a specific resource
   */
  startPolling({
    key,
    fetchFn,
    onData,
    interval = INTERVALS.NORMAL,
    immediate = true,
  }) {
    // Don't duplicate
    if (this.polls.has(key)) {
      console.log(`[Polling] Already polling: ${key}`);
      return;
    }

    const poll = async () => {
      if (!this.isActive) return;

      try {
        const data = await fetchFn();
        onData(data);
      } catch (error) {
        console.warn(`[Polling] Error for ${key}:`, error.message);
      }
    };

    // Initial fetch
    if (immediate) {
      poll();
    }

    // Set up interval
    const adjustedInterval = this.getAdjustedInterval(interval);
    const intervalId = setInterval(poll, adjustedInterval);

    this.polls.set(key, {
      intervalId,
      baseInterval: interval,
      fetchFn,
      onData,
    });

    console.log(`[Polling] Started: ${key} (${adjustedInterval}ms)`);

    return () => this.stopPolling(key);
  }

  /**
   * Stop polling for a specific resource
   */
  stopPolling(key) {
    const poll = this.polls.get(key);
    if (poll) {
      clearInterval(poll.intervalId);
      this.polls.delete(key);
      console.log(`[Polling] Stopped: ${key}`);
    }
  }

  /**
   * Stop all polling
   */
  stopAll() {
    this.polls.forEach((poll, key) => {
      clearInterval(poll.intervalId);
    });
    this.polls.clear();
    console.log('[Polling] Stopped all');
  }

  /**
   * Adjust interval based on visibility
   */
  getAdjustedInterval(baseInterval) {
    if (this.visibility === 'hidden') {
      return Math.max(baseInterval * 4, INTERVALS.SLOW);
    }
    return baseInterval;
  }

  /**
   * Adjust all intervals when visibility changes
   */
  adjustIntervals() {
    this.polls.forEach((poll, key) => {
      clearInterval(poll.intervalId);
      const adjustedInterval = this.getAdjustedInterval(poll.baseInterval);
      poll.intervalId = setInterval(async () => {
        if (!this.isActive) return;
        try {
          const data = await poll.fetchFn();
          poll.onData(data);
        } catch (error) {
          console.warn(`[Polling] Error for ${key}:`, error.message);
        }
      }, adjustedInterval);
    });
    console.log(`[Polling] Adjusted intervals for visibility: ${this.visibility}`);
  }

  /**
   * Pause all polling
   */
  pause() {
    this.isActive = false;
    console.log('[Polling] Paused');
  }

  /**
   * Resume all polling
   */
  resume() {
    this.isActive = true;
    console.log('[Polling] Resumed');
  }
}

// Singleton instance
export const pollingService = new FallbackPollingService();

/**
 * Hook-friendly polling for groups
 */
export function pollGroup(groupId, callbacks) {
  const supabase = supabaseBrowser();

  // Poll for group metadata
  const unsub1 = pollingService.startPolling({
    key: `group-${groupId}`,
    fetchFn: async () => {
      const { data } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      return data;
    },
    onData: (data) => callbacks.onGroupUpdate?.(data),
    interval: INTERVALS.NORMAL,
  });

  // Poll for members
  const unsub2 = pollingService.startPolling({
    key: `group-${groupId}-members`,
    fetchFn: async () => {
      const { data } = await supabase
        .from('group_members')
        .select(`
          user_id,
          joined_at,
          user:users(id, username, profile_picture_url)
        `)
        .eq('group_id', groupId);
      return data;
    },
    onData: (data) => callbacks.onMembersUpdate?.(data),
    interval: INTERVALS.NORMAL,
  });

  // Poll for playlists
  const unsub3 = pollingService.startPolling({
    key: `group-${groupId}-playlists`,
    fetchFn: async () => {
      const { data } = await supabase
        .from('group_playlists')
        .select('*')
        .eq('group_id', groupId);
      return data;
    },
    onData: (data) => callbacks.onPlaylistsUpdate?.(data),
    interval: INTERVALS.NORMAL,
  });

  return () => {
    unsub1?.();
    unsub2?.();
    unsub3?.();
  };
}

/**
 * Poll for friends' song of the day
 */
export function pollFriendsSongs(userId, onData) {
  const supabase = supabaseBrowser();

  return pollingService.startPolling({
    key: `friends-songs-${userId}`,
    fetchFn: async () => {
      // Get friend IDs
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      const friendIds = friendships?.map(f => 
        f.user1_id === userId ? f.user2_id : f.user1_id
      ) || [];

      if (friendIds.length === 0) return [];

      // Get their songs of the day
      const { data: songs } = await supabase
        .from('song_of_the_day')
        .select(`
          *,
          user:users(id, username, profile_picture_url)
        `)
        .in('user_id', friendIds)
        .order('created_at', { ascending: false });

      return songs;
    },
    onData,
    interval: INTERVALS.NORMAL,
  });
}

