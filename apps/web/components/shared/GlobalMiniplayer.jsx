'use client';

import { useState, useEffect, useRef } from 'react';
import { useMiniplayer } from '@/lib/context/GlobalStateContext';
import { X, SkipBack, SkipForward, ChevronUp, ChevronDown } from 'lucide-react';

export default function GlobalMiniplayer() {
  const { currentlyPlaying, hasNext, hasPrevious, playNext, playPrevious, stopPlaying, songQueue, currentQueueIndex } = useMiniplayer();
  const [isMinimized, setIsMinimized] = useState(false);
  const iframeRef = useRef(null);
  const hasNextRef = useRef(hasNext);
  const playNextRef = useRef(playNext);
  
  // Keep refs in sync
  useEffect(() => {
    hasNextRef.current = hasNext;
    playNextRef.current = playNext;
  }, [hasNext, playNext]);
  
  // Handle YouTube video end via postMessage API
  useEffect(() => {
    if (!currentlyPlaying || currentlyPlaying.platform !== 'youtube') return;
    
    const allowedHosts = [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com'
    ];
    const handleMessage = (event) => {
      let host;
      try {
        host = new URL(event.origin).host;
      } catch {
        return;
      }
      if (!allowedHosts.includes(host)) return;
      
      try {
        let data = event.data;
        
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            return;
          }
        }
        
        if (data.event === 'onStateChange' && data.info === 0) {
          console.log('[Miniplayer] YouTube video ended');
          if (hasNextRef.current) {
            playNextRef.current();
          }
        }
        
        if (data.event === 'infoDelivery' && data.info?.playerState === 0) {
          console.log('[Miniplayer] YouTube video ended (infoDelivery)');
          if (hasNextRef.current) {
            playNextRef.current();
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentlyPlaying?.id, currentlyPlaying?.platform]);
  
  if (!currentlyPlaying) return null;
  
  const song = currentlyPlaying;
  const isSpotify = song.platform === 'spotify';
  const isYouTube = song.platform === 'youtube';
  
  const getEmbedUrl = () => {
    if (isYouTube) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      return `https://www.youtube.com/embed/${song.external_id}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(origin)}&rel=0&modestbranding=1`;
    } else if (isSpotify) {
      return `https://open.spotify.com/embed/track/${song.external_id}?utm_source=generator&theme=0`;
    }
    return null;
  };
  
  const embedUrl = getEmbedUrl();
  if (!embedUrl) return null;
  
  const queueInfo = songQueue.length > 0 ? `${currentQueueIndex + 1}/${songQueue.length}` : null;
  
  // Minimized bar (compact controls only)
  if (isMinimized) {
    return (
      <div className="fixed z-50 bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[340px] sm:max-w-[calc(100vw-3rem)] sm:rounded-xl shadow-2xl overflow-hidden transition-all duration-300 bg-[#1a1a1a] [data-theme='light']:bg-white border border-[var(--border-color)]">
        {/* Minimized header */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-[#222] [data-theme='light']:bg-gray-100">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {song.thumbnail_url && (
              <img
                src={song.thumbnail_url}
                alt={song.title}
                className="w-10 h-10 rounded-md object-cover flex-shrink-0 shadow-md"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[var(--foreground)] font-semibold text-sm truncate">
                {song.parsed_title || song.title}
              </p>
              <p className="text-[var(--muted-foreground)] text-xs truncate">
                {song.parsed_artist || song.artist}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 ml-2">
            {/* Previous */}
            <button
              onClick={playPrevious}
              disabled={!hasPrevious}
              className="p-2 rounded-full bg-[var(--secondary-hover)] hover:bg-[var(--accent-muted)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous"
            >
              <SkipBack className="h-4 w-4 text-[var(--foreground)]" />
            </button>
            
            {/* Next */}
            <button
              onClick={playNext}
              disabled={!hasNext}
              className="p-2 rounded-full bg-[var(--secondary-hover)] hover:bg-[var(--accent-muted)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next"
            >
              <SkipForward className="h-4 w-4 text-[var(--foreground)]" />
            </button>
            
            {/* Expand */}
            <button
              onClick={() => setIsMinimized(false)}
              className="p-2 rounded-full transition-colors"
              style={{ backgroundColor: 'var(--accent)' }}
              title="Show player"
            >
              <ChevronUp className="h-4 w-4 text-white" />
            </button>
            
            {/* Close */}
            <button
              onClick={stopPlaying}
              className="p-2 rounded-full bg-[var(--secondary-hover)] hover:bg-red-600 transition-colors group"
              title="Close player"
            >
              <X className="h-4 w-4 text-[var(--muted-foreground)] group-hover:text-white" />
            </button>
          </div>
        </div>
        
        {/* Queue progress */}
        {queueInfo && (
          <div className="px-3 pb-2 pt-1 bg-[#1a1a1a] [data-theme='light']:bg-white">
            <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)] mb-1">
              <span>Queue</span>
              <span>{queueInfo}</span>
            </div>
            <div className="h-1 bg-[var(--secondary-bg)] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${((currentQueueIndex + 1) / songQueue.length) * 100}%`, backgroundColor: 'var(--accent)' }}
              />
            </div>
          </div>
        )}
        
        {/* Hidden iframe to keep audio playing - uses clip-path to hide without affecting layout */}
        <div 
          className="fixed w-[1px] h-[1px] overflow-hidden"
          style={{ 
            clipPath: 'inset(50%)',
            top: 0,
            left: 0,
          }}
        >
          {isYouTube ? (
            <iframe
              ref={iframeRef}
              key={song.external_id}
              src={embedUrl}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              width="300"
              height="170"
            />
          ) : (
            <iframe
              key={song.external_id}
              src={embedUrl}
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="eager"
              width="300"
              height="152"
            />
          )}
        </div>
      </div>
    );
  }
  
  // Expanded player (full view)
  return (
    <div className="fixed z-50 shadow-2xl overflow-hidden transition-all duration-300 bg-[#1a1a1a] [data-theme='light']:bg-white border border-[var(--border-color)] bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[360px] sm:max-w-[calc(100vw-3rem)] sm:rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-[var(--border-color)] bg-[#222] [data-theme='light']:bg-gray-100">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {song.thumbnail_url && (
            <img
              src={song.thumbnail_url}
              alt={song.title}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-md object-cover flex-shrink-0 shadow-md"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[var(--foreground)] font-semibold text-sm truncate">
              {song.parsed_title || song.title}
            </p>
            <p className="text-[var(--muted-foreground)] text-xs truncate">
              {song.parsed_artist || song.artist}
            </p>
          </div>
          {queueInfo && (
            <span 
              className="hidden sm:inline-block px-2 py-1 text-white text-xs font-medium rounded whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {queueInfo}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1 ml-2">
          {/* Previous */}
          <button
            onClick={playPrevious}
            disabled={!hasPrevious}
            className="p-1.5 sm:p-2 rounded-full bg-[var(--secondary-hover)] hover:bg-[var(--accent-muted)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous"
          >
            <SkipBack className="h-4 w-4 text-[var(--foreground)]" />
          </button>
          
          {/* Next */}
          <button
            onClick={playNext}
            disabled={!hasNext}
            className="p-1.5 sm:p-2 rounded-full bg-[var(--secondary-hover)] hover:bg-[var(--accent-muted)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next"
          >
            <SkipForward className="h-4 w-4 text-[var(--foreground)]" />
          </button>
          
          {/* Minimize */}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 sm:p-2 rounded-full bg-[var(--secondary-hover)] hover:bg-[var(--accent-muted)] transition-colors"
            title="Minimize"
          >
            <ChevronDown className="h-4 w-4 text-[var(--foreground)]" />
          </button>
          
          {/* Close */}
          <button
            onClick={stopPlaying}
            className="p-1.5 sm:p-2 rounded-full bg-[var(--secondary-hover)] hover:bg-red-600 transition-colors group"
            title="Close player"
          >
            <X className="h-4 w-4 text-[var(--muted-foreground)] group-hover:text-white" />
          </button>
        </div>
      </div>
      
      {/* Player embed */}
      <div className="overflow-hidden bg-[#1a1a1a] [data-theme='light']:bg-white">
        {isYouTube ? (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              ref={iframeRef}
              key={song.external_id}
              src={embedUrl}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        ) : (
          <iframe
            key={song.external_id}
            src={embedUrl}
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="eager"
            className="w-full"
            style={{ height: '152px', borderRadius: 0 }}
          />
        )}
      </div>
      
      {/* Mobile queue info */}
      {queueInfo && (
        <div className="sm:hidden px-3 py-2 border-t border-[var(--border-color)] bg-[#222] [data-theme='light']:bg-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--muted-foreground)]">Queue</span>
            <span className="font-medium" style={{ color: 'var(--accent)' }}>{queueInfo}</span>
          </div>
          <div className="mt-1.5 h-1 bg-[var(--secondary-hover)] rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentQueueIndex + 1) / songQueue.length) * 100}%`, backgroundColor: 'var(--accent)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
