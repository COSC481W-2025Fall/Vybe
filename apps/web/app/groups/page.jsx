'use client';

import { supabaseBrowser } from '@/lib/supabase/client';
import { Plus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between gap-12">
            <div>
              <h1 className="text-4xl font-bold mb-2">My Groups</h1>
              <p className="text-gray-400 text-lg">Manage your music groups and playlists</p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setShowJoinModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors border border-gray-700"
              >
                <Users className="h-5 w-5" />
                Join Group
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-200 text-black rounded-lg font-medium transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create Group
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Groups List */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-400">Loading groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="h-16 w-16 text-gray-600 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No groups yet</h2>
            <p className="text-gray-400 mb-6">Create a group or join one with a code to get started</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                <Users className="h-5 w-5" />
                Join Group
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-200 text-black rounded-lg font-medium transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create Group
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <GroupCard
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

function GroupCard({ group, isOwner, onClick }) {
  const [members, setMembers] = useState([]);
  const supabase = supabaseBrowser();

  useEffect(() => {
    async function loadMembers() {
      // Fetch owner
      const { data: owner } = await supabase
        .from('users')
        .select('id, username, profile_picture_url')
        .eq('id', group.owner_id)
        .single();

      // Fetch up to 2 additional members
      const { data: groupMembers } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', group.id)
        .limit(2);

      if (groupMembers && groupMembers.length > 0) {
        const { data: memberUsers } = await supabase
          .from('users')
          .select('id, username, profile_picture_url')
          .in('id', groupMembers.map(m => m.user_id));

        setMembers([owner, ...(memberUsers || [])].filter(Boolean));
      } else {
        setMembers(owner ? [owner] : []);
      }
    }

    loadMembers();
  }, [group.id, group.owner_id]);

  const formattedDate = new Date(group.created_at).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  });

  const displayMembers = members.slice(0, 3);
  const remainingCount = Math.max(0, (group.memberCount || 0) - displayMembers.length);

  return (
    <div
      onClick={onClick}
      className="relative p-6 rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm hover:border-gray-600 transition-all cursor-pointer"
    >
      {/* Header with title and badge */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-2xl font-bold text-white">{group.name}</h3>
        {isOwner ? (
          <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-xs font-medium border border-purple-500/30">
            Owner
          </span>
        ) : (
          <span className="px-3 py-1 bg-gray-700/50 text-gray-300 rounded-full text-xs font-medium">
            Public
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-400 text-sm mb-6">
        {group.description || 'No description'}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-6 mb-6 text-sm text-gray-400">
        <span>{group.memberCount || 1} members</span>
        <span>{group.playlist_songs?.length || 0} songs</span>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Created {formattedDate}
        </span>
      </div>

      {/* Bottom section with avatars and join code */}
      <div className="flex items-center justify-between">
        {/* Member avatars */}
        <div className="flex -space-x-2">
          {displayMembers.map((member, index) => (
            <div
              key={member?.id || index}
              className="w-8 h-8 rounded-full border-2 border-gray-900 overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500"
              title={member?.username || 'Member'}
            >
              {member?.profile_picture_url ? (
                <img
                  src={member.profile_picture_url}
                  alt={member.username || 'Member'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xs font-semibold">
                  {member?.username?.[0]?.toUpperCase() || 'M'}
                </div>
              )}
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-white text-xs">
              +{remainingCount}
            </div>
          )}
        </div>

        {/* Join code badge */}
        <div className="px-3 py-1.5 bg-gray-700/50 rounded-lg text-gray-300 text-sm font-mono font-semibold">
          {group.join_code || 'GENERATING...'}
        </div>
      </div>
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
      <div className="bg-gray-900 rounded-lg max-w-md w-full p-6 border border-gray-800">
        <h2 className="text-2xl font-bold mb-4">Join Group</h2>

        <form onSubmit={handleJoin}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Group Join Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter 6-character code"
              maxLength={6}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white uppercase focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || joinCode.length !== 6}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-md transition-colors"
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
      <div className="bg-gray-900 rounded-lg max-w-md w-full p-6 border border-gray-800">
        <h2 className="text-2xl font-bold mb-4">Create Group</h2>

        <form onSubmit={handleCreate}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Music Group"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={3}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
