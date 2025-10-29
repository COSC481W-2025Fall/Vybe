// components/AddFriendsModal.jsx
'use client';

import { Plus, Search, UserPlus, X } from 'lucide-react';
import { useState } from 'react';

export default function AddFriendsModal({ onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('search'); // 'search', 'browse', 'invite'

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

  const handleSendRequest = async (userId) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendId: userId }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the user status in the list
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, friendship_status: 'pending' } : u
        ));
      } else {
        alert(data.error || 'Failed to send friend request');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="vybe-aurora bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-400/20 rounded-lg">
              <UserPlus className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Add Friends</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50"
              placeholder="Search by username..."
              disabled={searching}
            />
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-blue-400 hover:bg-blue-500 disabled:bg-blue-400/50 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        <button
          onClick={handleBrowseAll}
          disabled={loading}
          className="w-full mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading all users...' : 'Browse All Users'}
        </button>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          {users.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground mb-2">
                Found {users.length} result{users.length !== 1 ? 's' : ''}
              </p>
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div>
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  {user.friendship_status === null && (
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-400 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  )}
                  {user.friendship_status === 'pending' && (
                    <span className="px-3 py-1.5 bg-yellow-400/20 text-yellow-400 rounded-lg text-sm">
                      Pending
                    </span>
                  )}
                  {user.friendship_status === 'accepted' && (
                    <span className="px-3 py-1.5 bg-green-400/20 text-green-400 rounded-lg text-sm">
                      Friends
                    </span>
                  )}
                </div>
              ))}
            </>
          )}
          {users.length === 0 && searchQuery && !searching && (
            <div className="text-center py-12">
              <UserPlus className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

