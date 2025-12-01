'use client';

import { useState } from 'react';
import { Music } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

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

  async function handleExportConfirm() {
    if (isExporting) return;
    
    setIsExporting(true);
    
    try {
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

      const data = await response.json();

      if (!response.ok) {
        // Handle 403 error with more specific message
        if (response.status === 403 && data.requiresReconnect) {
          throw new Error(data.message || 'Spotify permissions required. Please reconnect your Spotify account in Settings.');
        }
        throw new Error(data.error || data.message || 'Failed to export playlist to Spotify');
      }

      // Close dialog on success
      setShowExportDialog(false);
      setCustomPlaylistName('');
      
      let message = `Playlist exported successfully to Spotify!`;
      if (data.stats) {
        const { exportedTracks, totalTracks, missingTracks } = data.stats;
        message = `Exported "${data.playlist.name}" to Spotify: ${exportedTracks}/${totalTracks} tracks added`;
        if (missingTracks > 0) {
          message += ` (${missingTracks} tracks not found on Spotify)`;
        }
      }

      toast.success(message, {
        duration: 5000,
        action: data.playlist?.external_urls?.spotify ? {
          label: 'Open Playlist',
          onClick: () => window.open(data.playlist.external_urls.spotify, '_blank'),
        } : undefined,
      });
    } catch (error) {
      console.error('[Export Spotify] Error:', error);
      toast.error(error.message || 'Failed to export playlist to Spotify. Please try again.');
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Playlist Name
            </label>
            <input
              type="text"
              value={customPlaylistName}
              onChange={(e) => setCustomPlaylistName(e.target.value)}
              placeholder={`Enter a name (Default: ${defaultName})`}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={isExporting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isExporting) {
                  handleExportConfirm();
                }
              }}
            />
          </div>
          <DialogFooter>
            <button
              onClick={handleCloseDialog}
              disabled={isExporting}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 active:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleExportConfirm}
              disabled={isExporting}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 active:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? (
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

