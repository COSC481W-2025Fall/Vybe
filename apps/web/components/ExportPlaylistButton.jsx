'use client';

import { useState } from 'react';
import { Youtube } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Accessible Progress Bar component for YouTube export
 */
function ExportProgressBar({ isExporting, status }) {
  if (!isExporting) return null;
  
  return (
    <div className="mt-4 space-y-2" role="status" aria-live="polite">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--muted-foreground)]">{status || 'Preparing export...'}</span>
      </div>
      <div 
        className="h-2 bg-[var(--secondary-bg)] rounded-full overflow-hidden"
        role="progressbar"
        aria-label="Export progress"
        aria-busy={isExporting}
      >
        <div className="h-full w-1/3 bg-red-500 rounded-full animate-[progress-indeterminate_1.5s_ease-in-out_infinite]" />
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
 * ExportPlaylistButton - Reusable component for exporting playlists to YouTube
 * 
 * @param {Object} props
 * @param {string} props.sourceType - 'group' or 'community' (default: 'group')
 * @param {string} props.sourceId - The ID of the group or community
 * @param {string} props.playlistId - For groups: specific playlist ID or 'all' (optional for communities)
 * @param {string} props.defaultName - Default name shown in the dialog placeholder
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {string} props.className - Additional CSS classes for the button
 */
export default function ExportPlaylistButton({
  sourceType = 'group',
  sourceId,
  playlistId,
  defaultName = 'Playlist',
  disabled = false,
  className = '',
}) {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [customPlaylistName, setCustomPlaylistName] = useState('');
  const [exportStatus, setExportStatus] = useState('');

  // Export to YouTube mutation
  const exportToYouTubeMutation = useMutation({
    mutationFn: async ({ sourceType, sourceId, playlistId, customName }) => {
      setExportStatus('Creating YouTube playlist...');
      
      const response = await fetch('/api/export/youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceType,
          sourceId,
          playlistId,
          customName: customName || undefined,
        }),
      });

      // Check for non-JSON response (e.g., HTML error page)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server error occurred. Please try again later.');
      }

      const data = await response.json();

      if (!response.ok) {
        // Provide more helpful error messages
        if (response.status === 401 || response.status === 403) {
          throw new Error('YouTube access expired. Please go to Settings and reconnect your YouTube account.');
        }
        throw new Error(data.error || 'Failed to export playlist to YouTube');
      }

      return data;
    },
    onSuccess: (data) => {
      const { youtubePlaylistUrl, playlistTitle, songsAdded, songsFailed, totalSongs } = data;
      
      setExportStatus('Export complete!');
      
      // Brief pause to show completion
      setTimeout(() => {
        // Close dialog on success
        setShowExportDialog(false);
        setCustomPlaylistName('');
        setExportStatus('');
      }, 500);
      
      let message = `Playlist exported successfully!`;
      if (songsAdded && totalSongs) {
        message = `Exported "${playlistTitle}" to YouTube: ${songsAdded}/${totalSongs} songs added`;
        if (songsFailed > 0) {
          message += ` (${songsFailed} failed)`;
        }
      }

      toast.success(message, {
        duration: 6000,
        action: youtubePlaylistUrl ? {
          label: 'Open Playlist',
          onClick: () => window.open(youtubePlaylistUrl, '_blank'),
        } : undefined,
      });
    },
    onError: (error) => {
      console.error('[Export YouTube] Error:', error);
      setExportStatus('');
      // Show user-friendly error
      const userMessage = error.message?.includes('connect') || error.message?.includes('token')
        ? "Please connect your YouTube account first in Settings."
        : error.message?.includes('not found')
        ? "Some songs couldn't be found on YouTube."
        : "Couldn't export to YouTube. Please try again.";
      toast.error(userMessage, {
        duration: 7000,
      });
    },
  });

  function handleExportConfirm() {
    if (exportToYouTubeMutation.isPending) return;
    
    exportToYouTubeMutation.mutate({
      sourceType,
      sourceId,
      playlistId,
      customName: customPlaylistName.trim() || undefined,
    });
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
        disabled={disabled || exportToYouTubeMutation.isPending}
        className={`flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70 text-white rounded-lg font-medium transition-colors text-sm whitespace-nowrap ${className}`}
      >
        {exportToYouTubeMutation.isPending ? (
          <>
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Youtube className="h-4 w-4" />
            Export to YouTube
          </>
        )}
      </button>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export to YouTube</DialogTitle>
            <DialogDescription>
              Enter a custom name for your YouTube playlist, or leave blank to use the default name.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label 
              htmlFor="youtube-playlist-name"
              className="block text-sm font-medium text-[var(--foreground)] mb-2"
            >
              Playlist Name
            </label>
            <input
              id="youtube-playlist-name"
              type="text"
              value={customPlaylistName}
              onChange={(e) => setCustomPlaylistName(e.target.value)}
              placeholder={`Enter a name (Default: [Vybe Export] ${defaultName})`}
              className="w-full px-4 py-2 bg-[var(--input-bg)] border-2 border-[var(--glass-border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
              disabled={exportToYouTubeMutation.isPending}
              aria-describedby={exportToYouTubeMutation.isPending ? "youtube-export-progress" : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !exportToYouTubeMutation.isPending) {
                  handleExportConfirm();
                }
              }}
            />
            
            {/* Progress Bar */}
            <div id="youtube-export-progress">
              <ExportProgressBar 
                isExporting={exportToYouTubeMutation.isPending} 
                status={exportStatus} 
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={handleCloseDialog}
              disabled={exportToYouTubeMutation.isPending}
              className="px-4 py-2 bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] text-[var(--foreground)] border border-[var(--glass-border)] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleExportConfirm}
              disabled={exportToYouTubeMutation.isPending}
              aria-busy={exportToYouTubeMutation.isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {exportToYouTubeMutation.isPending ? (
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


