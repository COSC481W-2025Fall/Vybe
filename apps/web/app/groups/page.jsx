'use client';

import { Check, Copy, Plus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * GroupsPage Component
 * 
 * This component provides a complete interface for group management:
 * - Display all groups the user belongs to
 * - Create new groups with unique join codes
 * - Join existing groups using join codes
 * - Copy join codes to clipboard for sharing
 * 
 * Features:
 * - Real-time group list updates
 * - Form validation and error handling
 * - Modal-based forms for better UX
 * - Responsive design with Tailwind CSS
 * - Loading states and user feedback
 */
export default function GroupsPage() {
  // State management for groups and UI
  const [groups, setGroups] = useState([]);                    // Array of user's groups
  const [loading, setLoading] = useState(true);                // Loading state for initial fetch
  const [showCreateForm, setShowCreateForm] = useState(false); // Toggle create group modal
  const [showJoinForm, setShowJoinForm] = useState(false);     // Toggle join group modal
  const [formData, setFormData] = useState({                   // Form data for both modals
    name: '', 
    description: '', 
    joinCode: '' 
  });
  const [submitting, setSubmitting] = useState(false);        // Loading state for form submissions
  const [message, setMessage] = useState({ type: '', text: '' }); // Success/error messages
  const [copiedCode, setCopiedCode] = useState('');            // Track which code was copied

  // Fetch user's groups on component mount
  useEffect(() => {
    fetchGroups();
  }, []);

  /**
   * Fetch all groups that the current user belongs to
   * This function calls the GET /api/groups endpoint to retrieve user's groups
   */
  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      } else {
        setMessage({ type: 'error', text: 'Failed to load groups' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading groups' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle group creation form submission
   * This function calls the POST /api/groups endpoint to create a new group
   * @param {Event} e - Form submission event
   */
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      // Call the groups API to create a new group
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Show success message with the generated join code
        setMessage({ 
          type: 'success', 
          text: `Group "${data.group.name}" created successfully! Join code: ${data.group.join_code}` 
        });
        // Reset form and close modal
        setFormData({ name: '', description: '', joinCode: '' });
        setShowCreateForm(false);
        fetchGroups(); // Refresh the groups list to show the new group
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create group' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error creating group' });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle joining a group using a join code
   * This function calls the POST /api/groups/join endpoint to join an existing group
   * @param {Event} e - Form submission event
   */
  const handleJoinGroup = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      // Call the join API to add user to the group
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          joinCode: formData.joinCode
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Show success message
        setMessage({ 
          type: 'success', 
          text: `Successfully joined "${data.group.name}"!` 
        });
        // Reset form and close modal
        setFormData({ name: '', description: '', joinCode: '' });
        setShowJoinForm(false);
        fetchGroups(); // Refresh the groups list to show the joined group
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to join group' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error joining group' });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Copy join code to clipboard for easy sharing
   * This function uses the Clipboard API to copy the join code and provides visual feedback
   * @param {string} text - The join code to copy
   */
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      // Clear the copied state after 2 seconds
      setTimeout(() => setCopiedCode(''), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Groups</h1>
              <p className="text-blue-200">Create and join music groups with friends</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Group
              </button>
              <button
                onClick={() => setShowJoinForm(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Users className="h-4 w-4" />
                Join Group
              </button>
            </div>
          </div>

          {/* Message Display */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Groups List */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groups.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Users className="h-16 w-16 text-blue-300 mx-auto mb-4" />
                <h3 className="text-xl text-white mb-2">No groups yet</h3>
                <p className="text-blue-200 mb-4">Create your first group or join one with a code!</p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">{group.name}</h3>
                      {group.description && (
                        <p className="text-blue-200 text-sm">{group.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-1 rounded">
                        {group.group_members[0]?.role || 'member'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-200">Join Code:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-black/20 text-white px-2 py-1 rounded text-sm font-mono">
                          {group.join_code}
                        </code>
                        <button
                          onClick={() => copyToClipboard(group.join_code)}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          {copiedCode === group.join_code ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-blue-300" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-blue-300">
                      Created {new Date(group.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Create Group Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Create New Group</h2>
                <form onSubmit={handleCreateGroup}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Group Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter group name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional description"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Creating...' : 'Create Group'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Join Group Modal */}
          {showJoinForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Join Group</h2>
                <form onSubmit={handleJoinGroup}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Join Code *
                      </label>
                      <input
                        type="text"
                        value={formData.joinCode}
                        onChange={(e) => setFormData({ ...formData, joinCode: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        placeholder="Enter 6-character code"
                        maxLength={6}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Ask your friend for the 6-character join code
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowJoinForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Joining...' : 'Join Group'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
