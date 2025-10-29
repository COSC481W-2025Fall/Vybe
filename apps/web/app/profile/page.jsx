// app/profile/page.jsx
'use client';

import AddFriendsModal from '@/components/AddFriendsModal';
import FriendRequestsModal from '@/components/FriendRequestsModal';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Calendar, Heart, Mail, Music, Settings, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false);
  const [groupsCount, setGroupsCount] = useState(0);

  useEffect(() => {
    checkAuth();
    fetchFriends();
    fetchGroupsCount();
  }, []);

  async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      router.push('/sign-in');
      return;
    }

    setUser(session.user);
    setLoading(false);
  }

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends');
      const data = await response.json();
      
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchGroupsCount = async () => {
    try {
      const response = await fetch('/api/groups');
      const data = await response.json();
      if (data.success) {
        setGroupsCount(data.groups?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/sign-in');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  // Get user joined date
  const joinedDate = new Date(user.created_at).toLocaleDateString();

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            
            {/* User Info */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <h2 className="text-2xl font-semibold">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </h2>
                <p className="text-gray-400">{user.email}</p>
                <div className="flex items-center justify-center md:justify-start space-x-2 mt-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-400">
                    Joined {joinedDate}
                  </span>
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Music className="h-4 w-4 text-purple-400" />
                    <span className="font-medium">0</span>
                  </div>
                  <p className="text-sm text-gray-400">Song Today</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Users className="h-4 w-4 text-blue-400" />
                    <span className="font-medium">{groupsCount}</span>
                  </div>
                  <p className="text-sm text-gray-400">Groups</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Heart className="h-4 w-4 text-pink-400" />
                    <span className="font-medium">{friends.length}</span>
                  </div>
                  <p className="text-sm text-gray-400">Friends</p>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => setShowFriendRequestsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-400/20 hover:bg-purple-400/30 border border-purple-400/30 rounded-lg transition-colors"
              >
                <Mail className="h-4 w-4" />
                Requests
              </button>
              <button
                onClick={() => setShowAddFriendsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-400/20 hover:bg-blue-400/30 border border-blue-400/30 rounded-lg transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Add Friend
              </button>
              <Link 
                href="/settings"
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </div>
          </div>
        </div>

        {/* Song of the Day Section */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Music className="h-5 w-5" />
              <span>Song of the Day</span>
            </h3>
          </div>
          <div className="text-center py-8">
            <Music className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="font-medium mb-2">No song of the day yet</h3>
            <p className="text-gray-400 mb-4">Share your current favorite song with friends</p>
            <button className="px-4 py-2 bg-purple-400 hover:bg-purple-500 rounded-lg transition-colors">
              Set Song of the Day
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold flex items-center space-x-2 mb-4">
              <Users className="h-5 w-5" />
              <span>Recent Activity</span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Groups joined this week</span>
                <span className="px-2 py-1 bg-purple-400/20 text-purple-400 rounded text-sm">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Songs shared this month</span>
                <span className="px-2 py-1 bg-purple-400/20 text-purple-400 rounded text-sm">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Playlists collaborated on</span>
                <span className="px-2 py-1 bg-purple-400/20 text-purple-400 rounded text-sm">0</span>
              </div>
            </div>
          </div>

          {/* Friends Section */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Heart className="h-5 w-5" />
                <span>Friends ({friends.length})</span>
              </h3>
            </div>
            
            {friends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No friends yet</p>
                <button
                  onClick={() => setShowAddFriendsModal(true)}
                  className="px-4 py-2 bg-blue-400 hover:bg-blue-500 rounded-lg transition-colors"
                >
                  Add Friends
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.slice(0, 5).map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                      {friend.name?.charAt(0).toUpperCase() || 'F'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{friend.name}</p>
                      <p className="text-sm text-gray-400">@{friend.username}</p>
                    </div>
                  </div>
                ))}
                {friends.length > 5 && (
                  <p className="text-sm text-gray-400 text-center pt-2">
                    +{friends.length - 5} more friends
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="h-16"></div>
      </div>

      {/* Add Friends Modal */}
      {showAddFriendsModal && (
        <AddFriendsModal
          onClose={() => {
            setShowAddFriendsModal(false);
            fetchFriends(); // Refresh friends list after closing modal
          }}
        />
      )}

      {/* Friend Requests Modal */}
      {showFriendRequestsModal && (
        <FriendRequestsModal
          onClose={() => {
            setShowFriendRequestsModal(false);
            fetchFriends(); // Refresh friends list after closing modal
          }}
        />
      )}
    </div>
  );
}
