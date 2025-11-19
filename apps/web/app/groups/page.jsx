'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Users, Plus } from 'lucide-react';
import FullGroupCard from '@/components/shared/FullGroupCard';

export default function GroupsPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    checkAuth();
    loadGroups();
  }, []);

  async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      router.push('/sign-in');
      return;
    }

    setUser(session.user);
  }

  async function loadGroups() {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Get groups where user is owner or member with member count (simpler query)
    const { data: ownedGroups, error: ownedError } = await supabase
      .from('groups')
      .select(`
        *,
        group_members(count)
      `)
      .eq('owner_id', session.user.id);

    if (ownedError) {
      console.error('Error loading owned groups:', ownedError);
    }

    const { data: memberGroups, error: memberError } = await supabase
      .from('group_members')
      .select(`
        group_id,
        groups(
          *,
          group_members(count)
        )
      `)
      .eq('user_id', session.user.id);

    if (memberError) {
      console.error('Error loading member groups:', memberError);
    }

    const memberGroupsList = memberGroups?.map(m => m.groups) || [];
    const allGroups = [...(ownedGroups || []), ...memberGroupsList];

    // Remove duplicates and count members
    const uniqueGroups = Array.from(
      new Map(allGroups.map(g => [g.id, g])).values()
    ).map(group => ({
      ...group,
      memberCount: (group.group_members?.[0]?.count || 0) + 1 // +1 for owner
    }));

    setGroups(uniqueGroups);
    setLoading(false);
  }

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 md:gap-12">
            <div>
              <h1 className="page-title mb-1 text-xl sm:text-2xl">My Groups</h1>
              <p className="section-subtitle text-xs sm:text-sm">Manage your music groups and playlists</p>
              {/* Group count */}
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                {loading ? 'Loading...' : (() => {
                  if (groups.length === 1) {
                    return '1 group';
                  } else {
                    return `${groups.length} groups`;
                  }
                })()}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {!loading && groups.length > 0 && (
                <>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white/10 hover:bg-white/20 active:bg-white/20 text-white rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/20 text-sm sm:text-base"
                  >
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Join Group</span>
                  </button>

                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white hover:bg-gray-200 active:bg-gray-200 text-black rounded-lg font-medium transition-colors text-sm sm:text-base"
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Create Group</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Groups List */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12 sm:py-16 md:py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-white"></div>
              <p className="text-gray-400 text-sm sm:text-base">Loading groups...</p>
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 text-center px-4">
            <Users className="h-12 w-12 sm:h-16 sm:w-16 text-gray-600 mb-4" />
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">No groups yet</h2>
            <p className="text-gray-400 mb-6 text-sm sm:text-base">Create a group or join one with a code to get started</p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowJoinModal(true)}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/20 text-sm sm:text-base"
              >
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                Join Group
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white hover:bg-gray-200 text-black rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                Create Group
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {groups.map((group) => (
              <FullGroupCard
                key={group.id}
                group={group}
                isOwner={group.owner_id === user?.id}
                onClick={() => router.push(`/groups/${group.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Join Group Modal */}
      {showJoinModal && (
        <JoinGroupModal
          onClose={() => setShowJoinModal(false)}
          onSuccess={() => {
            setShowJoinModal(false);
            loadGroups();
          }}
        />
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadGroups();
          }}
        />
      )}
    </div>
  );
}

function JoinGroupModal({ onClose, onSuccess }) {
  const supabase = supabaseBrowser();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Find group by join code
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('join_code', joinCode.toUpperCase())
      .single();

    if (groupError || !group) {
      setError('Invalid join code');
      setLoading(false);
      return;
    }

    // Join the group
    const { error: joinError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: session.user.id,
      });

    if (joinError) {
      console.error('Join group error:', joinError);
      if (joinError.code === '23505') {
        setError('You are already a member of this group');
      } else if (joinError.code === '23503') {
        setError('Your user account is not properly set up. Please contact support.');
      } else {
        setError(`Failed to join group: ${joinError.message}`);
      }
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-md w-full p-4 sm:p-6 border border-gray-800 shadow-2xl">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Join Group</h2>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Group Join Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter 6-character code"
              maxLength={6}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white uppercase focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/20 text-white rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/20 text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || joinCode.length !== 6}
              className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-white hover:bg-gray-200 active:bg-gray-200 text-black rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateGroupModal({ onClose, onSuccess }) {
  const supabase = supabaseBrowser();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    //create group
    const { error: createError } = await supabase
      .from('groups')
      .insert({
        name,
        description,
        owner_id: session.user.id,
      });

    if (createError) {
      console.error('Create group error:', createError);
      setError(`Failed to create group: ${createError.message}`);
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-md w-full p-4 sm:p-6 border border-gray-800 shadow-2xl">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Create Group</h2>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Music Group"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={3}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/20 text-white rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/20 text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name}
              className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-white hover:bg-gray-200 active:bg-gray-200 text-black rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
