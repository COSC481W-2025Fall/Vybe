'use client';

import { useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Search, Plus, X, Eye } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Modal for searching and adding friends
 * Extracted for lazy loading
 */
function AddFriendsModalComponent({ onClose }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError('');

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.users || []);
      } else {
        setError(data.error || 'Failed to search users');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleBrowseAll = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/users/search?q=');
      const data = await response.json();

      if (data.success) {
        setUsers(data.users || []);
      }
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSendRequest = useCallback(async (userId, userName) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: userId }),
      });

      const data = await response.json();

      if (data.success) {
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, friendship_status: 'pending', friendship_direction: 'outgoing' } : u
        ));
        toast.success(`Friend request sent to ${userName}`);
      } else {
        toast.error(data.error || "Couldn't send the friend request. Please try again.");
      }
    } catch {
      toast.error("Couldn't connect to the server. Please check your internet.");
    }
  }, []);

  const handleAcceptRequest = useCallback(async (friendshipId, userId, userName) => {
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'accept' }),
      });
      const data = await response.json();
      
      if (data.success) {
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, friendship_status: 'accepted', friendship_direction: null } : u
        ));
        toast.success(`You're now friends with ${userName}! 🎉`);
      } else {
        toast.error(data.error || "Couldn't accept the request. Please try again.");
      }
    } catch {
      toast.error("Couldn't connect to the server. Please check your internet.");
    }
  }, []);

  const handleRejectRequest = useCallback(async (friendshipId, userId, userName) => {
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'reject' }),
      });
      const data = await response.json();
      
      if (data.success) {
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, friendship_status: null, friendship_direction: null, friendship_id: null } : u
        ));
        toast.success(`Declined request from ${userName}`);
      } else {
        toast.error(data.error || "Couldn't decline the request. Please try again.");
      }
    } catch {
      toast.error("Couldn't connect to the server. Please check your internet.");
    }
  }, []);

  const handleViewProfile = useCallback((username) => {
    onClose();
    router.push(`/u/${username}`);
  }, [onClose, router]);

  return (
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 min-h-[100dvh] bg-black/70 [data-theme='light']:bg-black/50 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-friends-title"
    >
      <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 sm:mb-6 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-blue-400/20 rounded-lg border border-blue-400/30">
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" aria-hidden="true" />
            </div>
            <h2 id="add-friends-title" className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
              Add Friends
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 [data-theme='light']:hover:bg-black/10 rounded transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5 text-[var(--muted-foreground)]" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="mb-4 sm:mb-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-2 bg-[var(--input-bg)] border-2 border-[var(--glass-border)] rounded-lg text-[var(--foreground)] text-base sm:text-sm placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400"
                placeholder="Search by username..."
                disabled={searching}
                aria-label="Search for users by username"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors font-medium"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        <button
          onClick={handleBrowseAll}
          disabled={loading}
          className="w-full mb-4 px-4 py-2.5 sm:py-2 btn-secondary rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {loading ? 'Loading all users...' : 'Browse All Users'}
        </button>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex-shrink-0" role="alert">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="overflow-y-auto flex-1 min-h-0 pr-2 modal-scroll" role="list" aria-label="Search results">
          {users.length > 0 && (
            <>
              <p className="text-sm text-[var(--muted-foreground)] mb-3" aria-live="polite">
                Found {users.length} result{users.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {users.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onSendRequest={handleSendRequest}
                    onAcceptRequest={handleAcceptRequest}
                    onRejectRequest={handleRejectRequest}
                    onViewProfile={handleViewProfile}
                  />
                ))}
              </div>
            </>
          )}
          {users.length === 0 && searchQuery && !searching && (
            <div className="text-center py-8 sm:py-12">
              <UserPlus className="h-12 w-12 sm:h-16 sm:w-16 text-[var(--muted-foreground)] mx-auto mb-4" aria-hidden="true" />
              <p className="text-[var(--muted-foreground)] text-sm sm:text-base">No users found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Memoized user card for search results
const UserCard = memo(function UserCard({ user, onSendRequest, onAcceptRequest, onRejectRequest, onViewProfile }) {
  return (
    <div
      className="flex flex-col p-3 bg-[var(--secondary-bg)] rounded-xl border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-colors"
      role="listitem"
    >
      {/* User Info */}
      <div className="text-center mb-3">
        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
          {user.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <p className="text-[var(--foreground)] font-medium text-sm truncate">{user.name}</p>
        <p className="text-xs text-[var(--muted-foreground)] truncate">@{user.username}</p>
      </div>
      
      {/* View Profile Button */}
      <button
        onClick={() => onViewProfile(user.username)}
        className="w-full mb-2 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 [data-theme='light']:hover:bg-black/5 rounded-lg transition-colors border border-[var(--glass-border)] flex items-center justify-center gap-1.5"
        aria-label={`View ${user.name}'s profile`}
      >
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        <span>View Profile</span>
      </button>

      {/* Action Button */}
      <div className="h-8 flex items-center justify-center">
        {user.friendship_status === null && (
          <button
            onClick={() => onSendRequest(user.id, user.name)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors"
            aria-label={`Send friend request to ${user.name}`}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Friend</span>
          </button>
        )}
        
        {user.friendship_status === 'pending' && user.friendship_direction === 'outgoing' && (
          <span className="w-full text-center py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs font-medium cursor-not-allowed">
            Pending
          </span>
        )}
        
        {user.friendship_status === 'pending' && user.friendship_direction === 'incoming' && (
          <div className="w-full flex gap-1.5">
            <button
              onClick={() => onAcceptRequest(user.friendship_id, user.id, user.name)}
              className="flex-1 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
              aria-label={`Accept friend request from ${user.name}`}
            >
              Accept
            </button>
            <button
              onClick={() => onRejectRequest(user.friendship_id, user.id, user.name)}
              className="flex-1 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium transition-colors"
              aria-label={`Reject friend request from ${user.name}`}
            >
              Reject
            </button>
          </div>
        )}
        
        {user.friendship_status === 'accepted' && (
          <span className="w-full text-center py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium cursor-not-allowed">
            ✓ Added
          </span>
        )}
      </div>
    </div>
  );
});

export const AddFriendsModal = memo(AddFriendsModalComponent);
