'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Search, Music, CheckCircle } from "lucide-react";
import { Input } from "../ui/input";
import { toast } from "sonner";

export function ShareSongDialog({ open, onOpenChange }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState(null);
  const [message, setMessage] = useState("");

  // Mock search results
  const searchResults = searchQuery.length > 2 ? [
    { id: "1", title: "Blinding Lights", artist: "The Weeknd", album: "After Hours" },
    { id: "2", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia" },
    { id: "3", title: "Save Your Tears", artist: "The Weeknd", album: "After Hours" },
  ] : [];

  const handleShare = () => {
    if (!selectedSong) {
      toast.error("Please select a song");
      return;
    }
    toast.success(`Shared "${selectedSong.title}" as your song of the day!`);
    onOpenChange(false);
    setSelectedSong(null);
    setMessage("");
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Share Your Song of the Day</DialogTitle>
          <DialogDescription>
            Choose a song to share with your friends
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto modal-scroll">
          <div>
            <Label htmlFor="song-search">Search for a song</Label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="song-search"
                placeholder="Search songs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {selectedSong && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Music className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="font-medium text-white">{selectedSong.title}</p>
                    <p className="text-sm text-gray-400">{selectedSong.artist}</p>
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
          )}

          {searchResults.length > 0 && !selectedSong && (
            <div className="space-y-2 max-h-48 overflow-y-auto modal-scroll">
              {searchResults.map((song) => (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => {
                    setSelectedSong(song);
                    setSearchQuery("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedSong(song);
                      setSearchQuery("");
                    }
                  }}
                  className="w-full text-left bg-gray-900/50 border border-gray-800 rounded-xl p-3 backdrop-blur-sm hover:bg-gray-800/50 active:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <Music className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-white">{song.title}</p>
                      <p className="text-sm text-gray-400">{song.artist}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div>
            <Label htmlFor="share-message">Add a message (optional)</Label>
            <Textarea
              id="share-message"
              placeholder="Why are you loving this song today?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              className="mt-2"
            />
            <p className="text-xs text-gray-400 mt-1">
              {message.length}/200
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 text-white rounded-lg font-medium transition-all backdrop-blur-[20px] border border-white/10 text-sm sm:text-base glass-card hover:bg-white/5 hover:border-white/15 active:bg-white/5 active:border-white/15"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={!selectedSong}
              className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 text-white rounded-lg font-medium transition-all backdrop-blur-[20px] border border-white/10 text-sm sm:text-base glass-card hover:bg-white/5 hover:border-white/15 active:bg-white/5 active:border-white/15 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/[0.03] disabled:hover:border-white/10 disabled:active:bg-transparent disabled:active:border-white/10"
            >
              Share Song
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
