'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Search, Users, TrendingUp, Music, ExternalLink, Eye } from "lucide-react";

export function CommunitiesDialog({ open, onOpenChange, communities = [] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCommunities = communities.filter(
    (community) =>
      community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleView = (community) => {
    // View functionality - open playlist detail
    // The parent component handles this via onClick on cards
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col p-4 sm:p-6">
        <DialogHeader className="pb-2 sm:pb-4 pr-8">
          <DialogTitle className="text-lg sm:text-xl">Browse Our Favorites</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Explore our curated favorite playlists and discover great music.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 flex-1 overflow-y-auto modal-scroll pr-1">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
            <Input
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm sm:text-base py-2 sm:py-2.5"
              aria-label="Search communities"
            />
          </div>

          {/* Favorites Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list" aria-label="Favorite playlists">
            {filteredCommunities.map((community) => (
              <article 
                key={community.id} 
                className="bg-[var(--secondary-bg)] border border-[var(--glass-border)] rounded-xl p-3 sm:p-4 h-[160px] flex flex-col"
                role="listitem"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-[var(--foreground)] text-sm truncate flex-1">
                    {community.name}
                  </h3>
                  {community.playlist_links?.length > 0 && (
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      <Music className="h-3 w-3 mr-1" aria-hidden="true" />
                      Active
                    </Badge>
                  )}
                </div>

                {/* Description - flexible */}
                <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 flex-1 min-h-[32px]">
                  {community.description || 'No description'}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--glass-border)] mt-auto">
                  <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                    <Music className="h-3 w-3" aria-hidden="true" />
                    <span>{community.playlist_links?.length || 0} playlists</span>
                  </div>
                  <button
                    onClick={() => handleJoin(community.name)}
                    className="flex items-center gap-1 px-2.5 py-1 btn-primary rounded-lg text-xs"
                    aria-label={`View ${community.name} community`}
                  >
                    <Eye className="h-3 w-3" aria-hidden="true" />
                    <span>View</span>
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Empty State */}
          {filteredCommunities.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <Music className="h-10 w-10 sm:h-12 sm:w-12 text-[var(--muted-foreground)] mx-auto mb-3 sm:mb-4" aria-hidden="true" />
              <p className="text-sm sm:text-base text-[var(--muted-foreground)]">No favorites found</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
