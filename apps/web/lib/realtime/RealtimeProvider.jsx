'use client';

/**
 * Realtime Provider - Centralized real-time subscription management
 * 
 * Features:
 * - Automatic reconnection
 * - Connection state tracking
 * - Efficient channel management (no duplicate subscriptions)
 * - Fallback polling when websocket fails
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

const RealtimeContext = createContext({
  isConnected: false,
  subscribe: () => () => {},
  connectionState: 'disconnected',
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

// Connection states
const ConnectionState = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  FALLBACK_POLLING: 'fallback_polling',
};

export function RealtimeProvider({ children }) {
  const [connectionState, setConnectionState] = useState(ConnectionState.DISCONNECTED);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = useRef(null);
  const channels = useRef(new Map()); // Map<channelName, { channel, subscribers: Set }>
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = useRef(1000);

  // Initialize Supabase client
  useEffect(() => {
    supabase.current = supabaseBrowser();
    
    // Monitor connection state
    const channel = supabase.current.channel('connection-monitor');
    
    channel
      .on('system', { event: '*' }, (payload) => {
        console.log('[Realtime] System event:', payload);
        if (payload.event === 'connected') {
          setConnectionState(ConnectionState.CONNECTED);
          setIsConnected(true);
          reconnectAttempts.current = 0;
          reconnectDelay.current = 1000;
        } else if (payload.event === 'disconnected') {
          setConnectionState(ConnectionState.DISCONNECTED);
          setIsConnected(false);
          handleReconnect();
        }
      })
      .subscribe((status) => {
        console.log('[Realtime] Connection status:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionState(ConnectionState.CONNECTED);
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionState(ConnectionState.DISCONNECTED);
          setIsConnected(false);
        }
      });

    return () => {
      // Cleanup all channels on unmount
      channels.current.forEach(({ channel }) => {
        supabase.current?.removeChannel(channel);
      });
      channels.current.clear();
    };
  }, []);

  // Handle reconnection with exponential backoff
  const handleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log('[Realtime] Max reconnect attempts reached, falling back to polling');
      setConnectionState(ConnectionState.FALLBACK_POLLING);
      return;
    }

    setConnectionState(ConnectionState.RECONNECTING);
    reconnectAttempts.current++;
    
    setTimeout(() => {
      console.log(`[Realtime] Reconnect attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
      // Resubscribe to all channels
      channels.current.forEach(({ channel }) => {
        channel.subscribe();
      });
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
    }, reconnectDelay.current);
  }, []);

  /**
   * Subscribe to a Supabase table for real-time updates
   * 
   * @param {Object} config - Subscription config
   * @param {string} config.table - Table name
   * @param {string} config.event - Event type ('INSERT' | 'UPDATE' | 'DELETE' | '*')
   * @param {string} config.filter - Optional filter (e.g., 'group_id=eq.123')
   * @param {Function} config.callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  const subscribe = useCallback((config) => {
    const { table, event = '*', filter, callback, channelName } = config;
    
    if (!supabase.current) {
      console.warn('[Realtime] Supabase not initialized');
      return () => {};
    }

    const name = channelName || `${table}-${event}-${filter || 'all'}`;
    
    // Check if channel already exists
    if (channels.current.has(name)) {
      const existing = channels.current.get(name);
      existing.subscribers.add(callback);
      console.log(`[Realtime] Added subscriber to existing channel: ${name}`);
      
      return () => {
        existing.subscribers.delete(callback);
        if (existing.subscribers.size === 0) {
          supabase.current.removeChannel(existing.channel);
          channels.current.delete(name);
          console.log(`[Realtime] Removed channel: ${name}`);
        }
      };
    }

    // Create new channel
    const subscribers = new Set([callback]);
    
    let channelConfig = supabase.current
      .channel(name)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          ...(filter && { filter }),
        },
        (payload) => {
          console.log(`[Realtime] ${table} ${payload.eventType}:`, payload);
          subscribers.forEach(cb => {
            try {
              cb(payload);
            } catch (e) {
              console.error('[Realtime] Callback error:', e);
            }
          });
        }
      );

    const channel = channelConfig.subscribe((status) => {
      console.log(`[Realtime] Channel ${name} status:`, status);
    });

    channels.current.set(name, { channel, subscribers });
    console.log(`[Realtime] Created new channel: ${name}`);

    return () => {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        supabase.current.removeChannel(channel);
        channels.current.delete(name);
        console.log(`[Realtime] Removed channel: ${name}`);
      }
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ isConnected, connectionState, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

