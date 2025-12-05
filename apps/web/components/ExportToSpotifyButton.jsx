'use client';

import { useState } from 'react';
import { Music, CheckCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

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
 */
export default function ExportToSpotifyButton({
  sourceType = 'group',
  sourceId,
  playlistId,
  groupId,
  defaultName = 'Playlist',
  disabled = false,
  className = '',
}) {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [customPlaylistName, setCustomPlaylistName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [exportProgress, setExportProgress] = useState(null);

  async function handleExportConfirm() {
    if (isExporting) return;
    
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
          <div className="py-4">
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
            
            {/* Progress Bar */}
            <div id="export-progress">
              <ExportProgressBar 
                isExporting={isExporting} 
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

