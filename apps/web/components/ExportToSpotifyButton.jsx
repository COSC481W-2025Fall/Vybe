'use client';

import { useState, useEffect } from 'react';
import { Music, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useExportJob, shouldUseBackgroundExport } from '@/lib/hooks/useExportJob';

/**
 * Accessible Progress Bar component
 */
function ExportProgressBar({ isExporting, status, progress }) {
  if (!isExporting) return null;
  
  const isIndeterminate = progress === null || progress === undefined;
  const progressPercent = isIndeterminate ? 0 : Math.min(100, Math.max(0, progress));
  
  return (
    <div className="mt-4 space-y-2" role="status" aria-live="polite">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--muted-foreground)]">{status || 'Preparing export...'}</span>
        {!isIndeterminate && (
          <span className="text-[var(--foreground)] font-medium">{progressPercent}%</span>
        )}
      </div>
      <div 
        className="h-2 bg-[var(--secondary-bg)] rounded-full overflow-hidden"
        role="progressbar"
        aria-label="Export progress"
        aria-valuenow={isIndeterminate ? undefined : progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-busy={isExporting}
      >
        {isIndeterminate ? (
          <div className="h-full w-1/3 bg-green-500 rounded-full animate-[progress-indeterminate_1.5s_ease-in-out_infinite]" />
        ) : (
          <div 
            className="h-full bg-green-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        )}
      </div>
      <style jsx>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

/**
 * ExportToSpotifyButton - Component for exporting playlists to Spotify
 * 
 * @param {Object} props
 * @param {string} props.sourceType - 'group' or 'community' (default: 'group')
 * @param {string} props.sourceId - The ID of the group or community
 * @param {string} props.playlistId - For groups: specific playlist ID or 'all' (optional for communities)
 * @param {string} props.groupId - Group ID (required when playlistId is 'all' and sourceType is 'group')
 * @param {string} props.defaultName - Default name shown in the dialog placeholder
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {string} props.className - Additional CSS classes for the button
 * @param {number} props.trackCount - Estimated track count (used to suggest background export)
 * @param {boolean} props.allowBackground - Whether to allow background export option (default: true)
 */
export default function ExportToSpotifyButton({
  sourceType = 'group',
  sourceId,
  playlistId,
  groupId,
  defaultName = 'Playlist',
  disabled = false,
  className = '',
  trackCount = 0,
  allowBackground = true,
}) {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [customPlaylistName, setCustomPlaylistName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [exportProgress, setExportProgress] = useState(null);
  const [useBackgroundExport, setUseBackgroundExport] = useState(false);
  
  // Background export hook
  const { 
    queueExport, 
    externalUrl,
    isComplete: isBackgroundComplete,
    isFailed: isBackgroundFailed,
    jobStatus
  } = useExportJob();
  
  // Auto-suggest background export for large playlists
  useEffect(() => {
    if (allowBackground && shouldUseBackgroundExport(trackCount)) {
      setUseBackgroundExport(true);
    }
  }, [trackCount, allowBackground]);
  
  // Handle background export completion - show toast notification
  useEffect(() => {
    if (isBackgroundComplete && externalUrl) {
      toast.success('Spotify export completed!', {
        duration: 10000,
        action: {
          label: 'Open Playlist',
          onClick: () => window.open(externalUrl, '_blank')
        }
      });
    } else if (isBackgroundFailed && jobStatus?.error_message) {
      toast.error(`Export failed: ${jobStatus.error_message}`, {
        duration: 8000
      });
    }
  }, [isBackgroundComplete, isBackgroundFailed, externalUrl, jobStatus]);

  // Handle background export - close dialog immediately and show toast
  async function handleBackgroundExport() {
    // Close dialog immediately
    setShowExportDialog(false);
    setCustomPlaylistName('');
    
    try {
      await queueExport({
        sourceType,
        sourceId,
        playlistId: sourceType === 'group' ? (playlistId === 'all' ? 'all' : playlistId) : undefined,
        name: customPlaylistName.trim() || defaultName,
        description: `Exported from Vybe${customPlaylistName.trim() ? ` - ${customPlaylistName.trim()}` : ''}`,
        isPublic: false,
        isCollaborative: false,
      });
      
      // Show simple toast - no progress bar, just notification
      toast.success("Export queued! We'll notify you when it's done.", {
        duration: 5000,
      });
    } catch (error) {
      console.error('[Export Spotify] Background export error:', error);
      toast.error(error.message || 'Failed to queue export');
    }
  }

  async function handleExportConfirm() {
    if (isExporting) return;
    
    // Use background export if selected - closes dialog immediately
    if (useBackgroundExport && allowBackground) {
      return handleBackgroundExport();
    }
    
    setIsExporting(true);
    setExportStatus('Preparing export...');
    setExportProgress(null);
    
    try {
      setExportStatus('Creating Spotify playlist...');
      
      const response = await fetch('/api/export-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceType,
          sourceId,
          playlistId: sourceType === 'group' ? (playlistId === 'all' ? 'all' : playlistId) : undefined,
          groupId: sourceType === 'group' && playlistId === 'all' ? groupId : undefined,
          name: customPlaylistName.trim() || undefined,
          description: `Exported from Vybe${customPlaylistName.trim() ? ` - ${customPlaylistName.trim()}` : ''}`,
          isPublic: false,
          isCollaborative: false,
        }),
      });

      // Check for non-JSON response
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server error occurred. Please try again later.');
      }

      const data = await response.json();

      if (!response.ok) {
        // Handle 403 error with more specific message
        if (response.status === 403 && data.requiresReconnect) {
          throw new Error(data.message || 'Spotify permissions required. Please reconnect your Spotify account in Settings.');
        }
        throw new Error(data.error || data.message || 'Failed to export playlist to Spotify');
      }

      setExportStatus('Export complete!');
      setExportProgress(100);
      
      // Brief pause to show completion
      await new Promise(resolve => setTimeout(resolve, 500));

      // Close dialog on success
      setShowExportDialog(false);
      setCustomPlaylistName('');
      setExportStatus('');
      setExportProgress(null);
      
      let message = `Playlist exported successfully to Spotify!`;
      if (data.stats) {
        const { exportedTracks, totalTracks, missingTracks } = data.stats;
        message = `Exported "${data.playlist.name}" to Spotify: ${exportedTracks}/${totalTracks} tracks added`;
        if (missingTracks > 0) {
          message += ` (${missingTracks} tracks not found on Spotify)`;
        }
      }

      toast.success(message, {
        duration: 6000,
        action: data.playlist?.external_urls?.spotify ? {
          label: 'Open Playlist',
          onClick: () => window.open(data.playlist.external_urls.spotify, '_blank'),
        } : undefined,
      });
    } catch (error) {
      console.error('[Export Spotify] Error:', error);
      setExportStatus('');
      setExportProgress(null);
      // Show user-friendly error
      const userMessage = error.message?.includes('connect') || error.message?.includes('token')
        ? "Please connect your Spotify account first in Settings."
        : error.message?.includes('not found')
        ? "Some songs couldn't be found on Spotify."
        : "Couldn't export to Spotify. Please try again.";
      toast.error(userMessage, {
        duration: 7000,
      });
    } finally {
      setIsExporting(false);
    }
  }

  function handleOpenDialog() {
    setShowExportDialog(true);
  }

  function handleCloseDialog() {
    setShowExportDialog(false);
    setCustomPlaylistName('');
  }

  return (
    <>
      {/* Export Button */}
      <button
        onClick={handleOpenDialog}
        disabled={disabled || isExporting}
        className={`flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 active:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed disabled:opacity-70 text-white rounded-lg font-medium transition-colors text-sm whitespace-nowrap ${className}`}
      >
        {isExporting ? (
          <>
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Music className="h-4 w-4" />
            Export to Spotify
          </>
        )}
      </button>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export to Spotify</DialogTitle>
            <DialogDescription>
              Enter a custom name for your Spotify playlist, or leave blank to use the default name.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label 
                htmlFor="spotify-playlist-name"
                className="block text-sm font-medium text-[var(--foreground)] mb-2"
              >
                Playlist Name
              </label>
              <input
                id="spotify-playlist-name"
                type="text"
                value={customPlaylistName}
                onChange={(e) => setCustomPlaylistName(e.target.value)}
                placeholder={`Enter a name (Default: ${defaultName})`}
                className="w-full px-4 py-2 bg-[var(--input-bg)] border-2 border-[var(--glass-border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                disabled={isExporting}
                aria-describedby={isExporting ? "export-progress" : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isExporting) {
                    handleExportConfirm();
                  }
                }}
              />
            </div>
            
            {/* Background Export Option */}
            {allowBackground && (
              <label className="flex items-start gap-3 p-3 rounded-lg bg-[var(--secondary-bg)] border border-[var(--glass-border)] cursor-pointer hover:bg-[var(--secondary-hover)] transition-colors">
                <input
                  type="checkbox"
                  checked={useBackgroundExport}
                  onChange={(e) => setUseBackgroundExport(e.target.checked)}
                  disabled={isExporting}
                  className="mt-0.5 w-4 h-4 accent-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                    <Clock className="h-4 w-4 text-green-500" />
                    Export in background
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {trackCount > 200 
                      ? `Recommended for ${trackCount}+ tracks. We'll notify you when it's done.`
                      : "We'll notify you when it's done. Best for large playlists."}
                  </p>
                </div>
              </label>
            )}
            
            {/* Regular Progress Bar - only for synchronous export */}
            <div id="export-progress">
              <ExportProgressBar 
                isExporting={isExporting && !useBackgroundExport} 
                status={exportStatus} 
                progress={exportProgress} 
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={handleCloseDialog}
              disabled={isExporting}
              className="px-4 py-2 bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] text-[var(--foreground)] border border-[var(--glass-border)] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleExportConfirm}
              disabled={isExporting}
              aria-busy={isExporting}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 active:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  <span>Exporting...</span>
                </>
              ) : useBackgroundExport ? (
                <>
                  <Clock className="h-4 w-4" />
                  Queue Export
                </>
              ) : (
                'Confirm Export'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
