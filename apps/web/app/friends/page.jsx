'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Trash2, 
  Search, 
  Plus, 
  X,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

export default function FriendsPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  
  // Modal states
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false);
  const [showRemoveFriendModal, setShowRemoveFriendModal] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState(null);

  useEffect(() => {
    checkAuth();
    loadFriends();
    loadPendingRequestsCount();
  }, []);

  async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      router.push('/sign-in');
      return;
    }
    setUser(session.user);
  }

  async function loadFriends() {
    setLoading(true);
    try {
      const response = await fetch('/api/friends');
      const data = await response.json();
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
      toast.error("Couldn't load your friends. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPendingRequestsCount() {
    try {
      const response = await fetch('/api/friends/requests');
      const data = await response.json();
      if (data.success) {
        setPendingRequestsCount(data.requests?.length || 0);
      }
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  }

  async function handleRemoveFriend(friend) {
    setFriendToRemove(friend);
    setShowRemoveFriendModal(true);
  }

  async function confirmRemoveFriend() {
    if (!friendToRemove) return;
    
    try {
      const response = await fetch(`/api/friends/${friendToRemove.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Friend removed');
        loadFriends();
      } else {
        toast.error(data.error || "Couldn't remove this friend. Please try again.");
      }
    } catch (error) {
      toast.error("Couldn't connect to the server. Please check your internet.");
    } finally {
      setShowRemoveFriendModal(false);
      setFriendToRemove(null);
    }
  }

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[var(--foreground)]" aria-hidden="true"></div>
          <p className="text-[var(--muted-foreground)] text-sm sm:text-base">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[var(--foreground)]">
      {/* Header */}
      <div className="border-b border-[var(--glass-border)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div>
              <h1 className="page-title mb-1 text-xl sm:text-2xl">Friends</h1>
              <p className="section-subtitle text-xs sm:text-sm">
                Manage your friends and see what they're listening to
              </p>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">
                {loading ? 'Loading...' : `${friends.length} friend${friends.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowFriendRequestsModal(true)}
                className="relative flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 btn-secondary rounded-lg text-sm sm:text-base"
                aria-label={`Friend requests${pendingRequestsCount > 0 ? `, ${pendingRequestsCount} pending` : ''}`}
              >
                <Mail className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                <span>Requests</span>
                {pendingRequestsCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                    aria-hidden="true"
                  >
                    {pendingRequestsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowAddFriendsModal(true)}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 btn-primary rounded-lg text-sm sm:text-base"
              >
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                <span>Add Friends</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12 sm:py-16 md:py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[var(--foreground)]" aria-hidden="true"></div>
              <p className="text-[var(--muted-foreground)] text-sm sm:text-base">Loading friends...</p>
            </div>
          </div>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 text-center px-4">
            <Users className="h-12 w-12 sm:h-16 sm:w-16 text-[var(--muted-foreground)] mb-4" aria-hidden="true" />
            <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-[var(--foreground)]">No friends yet</h2>
            <p className="text-[var(--muted-foreground)] mb-6 text-sm sm:text-base max-w-md">
              Start connecting with friends to share music and see what they're listening to
            </p>
            <button
              onClick={() => setShowAddFriendsModal(true)}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 btn-primary rounded-lg text-sm sm:text-base"
            >
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              Add Your First Friend
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {friends.map((friend) => (
              <article
                key={friend.id}
                className="glass-card rounded-xl p-4 sm:p-5 hover:border-[var(--glass-border-hover)] transition-colors"
                aria-label={`Friend: ${friend.name || friend.username}`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Clickable Profile Section */}
                  <button
                    onClick={() => router.push(`/u/${friend.username}`)}
                    className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden">
                      {friend.profile_picture_url ? (
                        <img
                          src={friend.profile_picture_url}
                          alt=""
                          className="w-full h-full object-cover"
                          aria-hidden="true"
                        />
                      ) : (
                        <span aria-hidden="true">
                          {friend.name?.charAt(0)?.toUpperCase() || friend.username?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--foreground)] truncate">
                        {friend.name || friend.username}
                      </h3>
                      <p className="text-sm text-[var(--muted-foreground)] truncate">
                        @{friend.username}
                      </p>
                      {friend.bio && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2 opacity-80">
                          {friend.bio}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFriend(friend);
                    }}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors border border-transparent hover:border-red-500/30 flex-shrink-0"
                    aria-label={`Remove ${friend.name || friend.username} as friend`}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Add Friends Modal */}
      {showAddFriendsModal && (
        <AddFriendsModal
          onClose={() => {
            setShowAddFriendsModal(false);
            loadFriends();
            loadPendingRequestsCount();
          }}
        />
      )}

      {/* Friend Requests Modal */}
      {showFriendRequestsModal && (
        <FriendRequestsModal
          onClose={() => {
            setShowFriendRequestsModal(false);
            loadFriends();
            loadPendingRequestsCount();
          }}
          onRequestsChanged={() => {
            loadFriends();
            loadPendingRequestsCount();
          }}
        />
      )}

      {/* Remove Friend Confirmation Modal */}
      {showRemoveFriendModal && friendToRemove && (
        <div 
          className="fixed top-0 left-0 right-0 bottom-0 min-h-[100dvh] bg-black/70 [data-theme='light']:bg-black/50 backdrop-blur-md flex items-center justify-center z-[60] p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="remove-friend-title"
          aria-describedby="remove-friend-description"
        >
          <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-sm w-full border border-[var(--glass-border)] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/30">
                <Trash2 className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <h3 id="remove-friend-title" className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
                Remove Friend?
              </h3>
            </div>
            
            <p id="remove-friend-description" className="text-sm sm:text-base text-[var(--muted-foreground)] mb-6">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-[var(--foreground)]">
                {friendToRemove.name || friendToRemove.username}
              </span>{' '}
              as a friend? You'll need to send a new friend request to reconnect.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveFriendModal(false);
                  setFriendToRemove(null);
                }}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] text-[var(--foreground)] rounded-xl font-medium transition-colors border border-[var(--glass-border)]"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveFriend}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline AddFriendsModal component with accessibility improvements
function AddFriendsModal({ onClose }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
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
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleBrowseAll = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/users/search?q=');
      const data = await response.json();

      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (error) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId, userName) => {
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
    } catch (error) {
      toast.error("Couldn't connect to the server. Please check your internet.");
    }
  };

  const handleAcceptRequest = async (friendshipId, userId, userName) => {
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
    } catch (error) {
      toast.error("Couldn't connect to the server. Please check your internet.");
    }
  };

  const handleRejectRequest = async (friendshipId, userId, userName) => {
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
    } catch (error) {
      toast.error("Couldn't connect to the server. Please check your internet.");
    }
  };

  const handleViewProfile = (username) => {
    onClose();
    router.push(`/u/${username}`);
  };

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
                  <div
                    key={user.id}
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
                    
                    {/* View Profile Button - Always same position */}
                    <button
                      onClick={() => handleViewProfile(user.username)}
                      className="w-full mb-2 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 [data-theme='light']:hover:bg-black/5 rounded-lg transition-colors border border-[var(--glass-border)] flex items-center justify-center gap-1.5"
                      aria-label={`View ${user.name}'s profile`}
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>View Profile</span>
                    </button>

                    {/* Action Button - Variable content but fixed position */}
                    <div className="h-8 flex items-center justify-center">
                      {/* No relationship - Add Friend */}
                      {user.friendship_status === null && (
                        <button
                          onClick={() => handleSendRequest(user.id, user.name)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors"
                          aria-label={`Send friend request to ${user.name}`}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Add Friend</span>
                        </button>
                      )}
                      
                      {/* Outgoing pending - Pending (disabled) */}
                      {user.friendship_status === 'pending' && user.friendship_direction === 'outgoing' && (
                        <span className="w-full text-center py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs font-medium cursor-not-allowed">
                          Pending
                        </span>
                      )}
                      
                      {/* Incoming pending - Accept + Reject */}
                      {user.friendship_status === 'pending' && user.friendship_direction === 'incoming' && (
                        <div className="w-full flex gap-1.5">
                          <button
                            onClick={() => handleAcceptRequest(user.friendship_id, user.id, user.name)}
                            className="flex-1 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
                            aria-label={`Accept friend request from ${user.name}`}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(user.friendship_id, user.id, user.name)}
                            className="flex-1 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium transition-colors"
                            aria-label={`Reject friend request from ${user.name}`}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      
                      {/* Already friends - Added (disabled) */}
                      {user.friendship_status === 'accepted' && (
                        <span className="w-full text-center py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium cursor-not-allowed">
                          ✓ Added
                        </span>
                      )}
                    </div>
                  </div>
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

// Inline FriendRequestsModal - shows BOTH incoming and outgoing requests
function FriendRequestsModal({ onClose, onRequestsChanged }) {
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    try {
      const response = await fetch('/api/friends/requests');
      const data = await response.json();
      if (data.success) {
        setReceivedRequests(data.received || []);
        setSentRequests(data.sent || []);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error("Couldn't load friend requests. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(friendshipId, userName) {
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'accept' }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`You're now friends with ${userName}! 🎉`);
        loadRequests();
        onRequestsChanged?.();
      } else {
        toast.error(data.error || "Couldn't accept the request. Please try again.");
      }
    } catch (error) {
      toast.error("Couldn't connect to the server. Please check your internet.");
    }
  }

  async function handleReject(friendshipId, userName) {
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'reject' }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Declined request from ${userName}`);
        loadRequests();
        onRequestsChanged?.();
      } else {
        toast.error(data.error || "Couldn't decline the request. Please try again.");
      }
    } catch (error) {
      toast.error("Couldn't connect to the server. Please check your internet.");
    }
  }

  async function handleCancelSent(friendshipId, userName) {
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'reject' }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Cancelled request to ${userName}`);
        loadRequests();
        onRequestsChanged?.();
      } else {
        toast.error(data.error || "Couldn't cancel the request. Please try again.");
      }
    } catch (error) {
      toast.error("Couldn't connect to the server. Please check your internet.");
    }
  }

  const totalRequests = receivedRequests.length + sentRequests.length;

  return (
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 min-h-[100dvh] bg-black/70 [data-theme='light']:bg-black/50 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="friend-requests-title"
    >
      <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-purple-400/20 rounded-lg border border-purple-400/30">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" aria-hidden="true" />
            </div>
            <h2 id="friend-requests-title" className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
              Friend Requests
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

        {/* Tabs */}
        <div className="flex gap-2 mb-4 flex-shrink-0">
          <button
            onClick={() => setActiveTab('received')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'received'
                ? 'bg-purple-500 text-white'
                : 'bg-[var(--secondary-bg)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            Received {receivedRequests.length > 0 && `(${receivedRequests.length})`}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'sent'
                ? 'bg-yellow-500 text-white'
                : 'bg-[var(--secondary-bg)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            Pending {sentRequests.length > 0 && `(${sentRequests.length})`}
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-2 modal-scroll" role="list" aria-label="Friend requests">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent)]" aria-hidden="true"></div>
              <span className="sr-only">Loading friend requests</span>
            </div>
          ) : activeTab === 'received' ? (
            receivedRequests.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Mail className="h-12 w-12 sm:h-16 sm:w-16 text-[var(--muted-foreground)] mx-auto mb-4" aria-hidden="true" />
                <p className="text-[var(--muted-foreground)] text-sm sm:text-base">No incoming requests</p>
              </div>
            ) : (
              receivedRequests.map((request) => (
                <div
                  key={request.friendship_id}
                  className="flex items-center justify-between p-2.5 sm:p-3 bg-[var(--secondary-bg)] rounded-lg border border-[var(--glass-border)] gap-2"
                  role="listitem"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      <span aria-hidden="true">
                        {request.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[var(--foreground)] font-medium text-sm truncate">
                        {request.name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] truncate">
                        @{request.username || 'unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAccept(request.friendship_id, request.name)}
                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs sm:text-sm transition-colors"
                      aria-label={`Accept friend request from ${request.name}`}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(request.friendship_id, request.name)}
                      className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-xs sm:text-sm transition-colors"
                      aria-label={`Decline friend request from ${request.name}`}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            sentRequests.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <UserPlus className="h-12 w-12 sm:h-16 sm:w-16 text-[var(--muted-foreground)] mx-auto mb-4" aria-hidden="true" />
                <p className="text-[var(--muted-foreground)] text-sm sm:text-base">No pending requests</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">Requests you send will appear here</p>
              </div>
            ) : (
              sentRequests.map((request) => (
                <div
                  key={request.friendship_id}
                  className="flex items-center justify-between p-2.5 sm:p-3 bg-[var(--secondary-bg)] rounded-lg border border-yellow-500/20 gap-2"
                  role="listitem"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      <span aria-hidden="true">
                        {request.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[var(--foreground)] font-medium text-sm truncate">
                        {request.name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] truncate">
                        @{request.username || 'unknown'}
                      </p>
                      <p className="text-xs text-yellow-400">Waiting for response...</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelSent(request.friendship_id, request.name)}
                    className="px-3 py-1.5 bg-[var(--secondary-bg)] hover:bg-red-500/20 text-[var(--muted-foreground)] hover:text-red-400 border border-[var(--glass-border)] hover:border-red-500/30 rounded-lg text-xs sm:text-sm transition-colors"
                    aria-label={`Cancel friend request to ${request.name}`}
                  >
                    Cancel
                  </button>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}

