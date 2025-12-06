'use client';

import { useState, useEffect, useRef } from 'react';
import { useMiniplayer } from '@/lib/context/GlobalStateContext';
import { X, ChevronUp, ChevronDown, SkipBack, SkipForward, Minimize2, Maximize2 } from 'lucide-react';

export default function GlobalMiniplayer() {
  const { currentlyPlaying, hasNext, hasPrevious, playNext, playPrevious, stopPlaying, songQueue, currentQueueIndex } = useMiniplayer();
  const [isExpanded, setIsExpanded] = useState(false);
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
    
    const handleMessage = (event) => {
      if (!event.origin.includes('youtube.com')) return;
      
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
  
  return (
    <div 
      className={`fixed z-50 glass-card shadow-2xl border border-[var(--glass-border)] overflow-hidden transition-all duration-300 ${
        isMinimized
          ? 'bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[320px] sm:rounded-xl'
          : isExpanded 
            ? 'bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[400px] sm:rounded-xl' 
            : 'bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[360px] sm:rounded-xl'
      }`}
    >
      {/* Header with song info */}
      <div className="flex items-center justify-between bg-[var(--secondary-bg)] px-3 sm:px-4 py-2 border-b border-[var(--glass-border)]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {song.thumbnail_url && (
            <img
              src={song.thumbnail_url}
              alt={song.title}
              className={`rounded object-cover flex-shrink-0 ${isMinimized ? 'w-8 h-8' : 'w-8 h-8 sm:w-10 sm:h-10'}`}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className={`text-[var(--foreground)] font-semibold truncate ${isMinimized ? 'text-xs' : 'text-xs sm:text-sm'}`}>
              {song.parsed_title || song.title}
            </p>
            <p className="text-[var(--muted-foreground)] text-[10px] sm:text-xs truncate">
              {song.parsed_artist || song.artist}
            </p>
          </div>
          {queueInfo && !isMinimized && (
            <span className="hidden sm:inline-block px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded border border-purple-600/30 whitespace-nowrap flex-shrink-0">
              {queueInfo}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-0.5 ml-2">
          {/* Previous button */}
          <button
            onClick={playPrevious}
            disabled={!hasPrevious}
            className="p-1.5 hover:bg-[var(--secondary-hover)] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous"
          >
            <SkipBack className="h-4 w-4 text-[var(--muted-foreground)]" />
          </button>
          
          {/* Next button */}
          <button
            onClick={playNext}
            disabled={!hasNext}
            className="p-1.5 hover:bg-[var(--secondary-hover)] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next"
          >
            <SkipForward className="h-4 w-4 text-[var(--muted-foreground)]" />
          </button>
          
          {/* Minimize/Maximize button */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-[var(--secondary-hover)] rounded transition-colors"
            title={isMinimized ? 'Show player' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4 text-[var(--muted-foreground)]" />
            ) : (
              <Minimize2 className="h-4 w-4 text-[var(--muted-foreground)]" />
            )}
          </button>
          
          {/* Expand/Collapse button - only show when not minimized */}
          {!isMinimized && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-[var(--secondary-hover)] rounded transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
              ) : (
                <ChevronUp className="h-4 w-4 text-[var(--muted-foreground)]" />
              )}
            </button>
          )}
          
          {/* Close button */}
          <button
            onClick={stopPlaying}
            className="p-1.5 hover:bg-[var(--secondary-hover)] rounded transition-colors"
            title="Close player"
          >
            <X className="h-4 w-4 text-[var(--muted-foreground)]" />
          </button>
        </div>
      </div>
      
      {/* Queue progress bar - show when minimized */}
      {isMinimized && queueInfo && (
        <div className="px-3 py-1.5">
          <div className="h-0.5 bg-[var(--secondary-bg)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentQueueIndex + 1) / songQueue.length) * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Player embed - hidden when minimized but still rendered to keep audio playing */}
      <div 
        className={`transition-all duration-300 overflow-hidden ${
          isMinimized 
            ? 'h-0 opacity-0' 
            : isExpanded 
              ? 'max-h-[400px] opacity-100' 
              : 'max-h-[152px] opacity-100'
        }`}
        style={{ 
          // Keep iframe rendered but hidden when minimized
          visibility: isMinimized ? 'hidden' : 'visible',
          position: isMinimized ? 'absolute' : 'relative',
          pointerEvents: isMinimized ? 'none' : 'auto',
        }}
      >
        {isYouTube ? (
          <div className="relative w-full" style={{ paddingBottom: isExpanded ? '56.25%' : '42%' }}>
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
            style={{ height: isExpanded ? '232px' : '152px', borderRadius: 0 }}
          />
        )}
      </div>
    </div>
  );
}
