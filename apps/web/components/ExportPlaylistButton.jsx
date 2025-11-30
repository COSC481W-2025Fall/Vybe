'use client';

import { useState } from 'react';
import { Youtube } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

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

  // Export to YouTube mutation
  const exportToYouTubeMutation = useMutation({
    mutationFn: async ({ sourceType, sourceId, playlistId, customName }) => {
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to export playlist to YouTube');
      }

      return data;
    },
    onSuccess: (data) => {
      const { youtubePlaylistUrl, playlistTitle, songsAdded, songsFailed, totalSongs } = data;
      
      // Close dialog on success
      setShowExportDialog(false);
      setCustomPlaylistName('');
      
      let message = `Playlist exported successfully!`;
      if (songsAdded && totalSongs) {
        message = `Exported "${playlistTitle}" to YouTube: ${songsAdded}/${totalSongs} songs added`;
        if (songsFailed > 0) {
          message += ` (${songsFailed} failed)`;
        }
      }

      toast.success(message, {
        duration: 5000,
        action: youtubePlaylistUrl ? {
          label: 'Open Playlist',
          onClick: () => window.open(youtubePlaylistUrl, '_blank'),
        } : undefined,
      });
    },
    onError: (error) => {
      console.error('[Export YouTube] Error:', error);
      toast.error(error.message || 'Failed to export playlist to YouTube. Please try again.');
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Playlist Name
            </label>
            <input
              type="text"
              value={customPlaylistName}
              onChange={(e) => setCustomPlaylistName(e.target.value)}
              placeholder={`Enter a name (Default: [Vybe Export] ${defaultName})`}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={exportToYouTubeMutation.isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !exportToYouTubeMutation.isPending) {
                  handleExportConfirm();
                }
              }}
            />
          </div>
          <DialogFooter>
            <button
              onClick={handleCloseDialog}
              disabled={exportToYouTubeMutation.isPending}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 active:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleExportConfirm}
              disabled={exportToYouTubeMutation.isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {exportToYouTubeMutation.isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Exporting...
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

