'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Search, Users, TrendingUp, Music } from "lucide-react";
import { toast } from "sonner";

export function CommunitiesDialog({ open, onOpenChange, communities = [] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCommunities = communities.filter(
    (community) =>
      community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoin = (communityName) => {
    toast.success(`Joined ${communityName}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Browse Communities</DialogTitle>
          <DialogDescription>
            Discover music communities and connect with like-minded listeners
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredCommunities.map((community) => (
              <div key={community.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 backdrop-blur-sm">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-white">{community.name}</h3>
                        {community.member_count > 2000 && (
                          <Badge variant="secondary" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Trending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {community.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <Users className="h-4 w-4" />
                      <span>{community.member_count?.toLocaleString() || 0}</span>
                    </div>
                    <button
                      onClick={() => handleJoin(community.name)}
                      className="px-4 py-2 bg-white hover:bg-gray-200 text-black rounded-lg font-medium transition-colors text-sm"
                    >
                      Join
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredCommunities.length === 0 && (
            <div className="text-center py-8">
              <Music className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No communities found</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
