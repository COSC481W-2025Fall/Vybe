// components/CreateGroupModal.jsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Validation schema
const groupSchema = z.object({
  name: z.string()
    .min(1, 'Group name is required')
    .min(3, 'Group name must be at least 3 characters')
    .max(50, 'Group name must be less than 50 characters'),
  privacy: z.enum(['public', 'private'], {
    required_error: 'Please select a privacy level'
  }),
  description: z.string()
    .max(200, 'Description must be less than 200 characters')
    .optional()
});

export default function CreateGroupModal({ onClose, onGroupCreated }) {
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      privacy: 'public',
      description: ''
    }
  });

  // Mock friends data - replace with actual API call later
  const mockFriends = [
    { id: '1', name: 'Alice Johnson', username: 'alice_j' },
    { id: '2', name: 'Bob Smith', username: 'bob_smith' },
    { id: '3', name: 'Charlie Brown', username: 'charlie_b' },
    { id: '4', name: 'Diana Prince', username: 'diana_p' },
    { id: '5', name: 'Eve Wilson', username: 'eve_w' }
  ];

  // Filter friends based on search
  const filteredFriends = mockFriends.filter(friend =>
    friend.name.toLowerCase().includes(friendSearch.toLowerCase()) ||
    friend.username.toLowerCase().includes(friendSearch.toLowerCase())
  );

  const handleFriendToggle = (friend) => {
    setSelectedFriends(prev => {
      const isSelected = prev.some(f => f.id === friend.id);//check if the friend is already selected
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id);//remove the friend from the selected friends
      } else {
        return [...prev, friend];//add the friend to the selected friends
      }
    });
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          members: selectedFriends.map(f => f.id) // Send friend IDs to backend
        }),
      });

      const result = await response.json();

      if (result.success) {
        onGroupCreated(result.group);
        reset();
        setSelectedFriends([]);
        setFriendSearch('');
      } else {
        console.error('Failed to create group:', result.error);
      }
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedFriends([]);
    setFriendSearch('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-b from-gray-900 to-black border border-white/20 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-400/20 rounded-lg">
              <Users className="h-5 w-5 text-yellow-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Create New Group</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Group Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
              Group Name *
            </label>
            <input
              {...register('name')}
              type="text"
              id="name"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
              placeholder="Enter group name"
            />
            {errors.name && (
              <p className="mt-2 text-sm text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* Privacy Level */}
          <div>
            <label htmlFor="privacy" className="block text-sm font-medium text-white mb-2">
              Privacy Level *
            </label>
            <select
              {...register('privacy')}
              id="privacy"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
            >
              <option value="public">Public - Anyone can join</option>
              <option value="private">Private - Invite only</option>
            </select>
            {errors.privacy && (
              <p className="mt-2 text-sm text-red-400">{errors.privacy.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
              Description (Optional)
            </label>
            <textarea
              {...register('description')}
              id="description"
              rows={3}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 resize-none transition-all"
              placeholder="Describe your group..."
            />
            {errors.description && (
              <p className="mt-2 text-sm text-red-400">{errors.description.message}</p>
            )}
          </div>

          {/* Friend Search */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Add Friends (Optional)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                placeholder="Search friends..."
              />
            </div>
            
            {/* Friend List */}
            {friendSearch && (
              <div className="mt-3 max-h-40 overflow-y-auto bg-white/5 rounded-lg border border-white/10">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => handleFriendToggle(friend)}
                    className={`p-3 cursor-pointer hover:bg-white/10 transition-colors flex items-center justify-between ${
                      selectedFriends.some(f => f.id === friend.id) ? 'bg-yellow-400/20' : ''
                    }`}
                  >
                    <div>
                      <p className="text-white font-medium">{friend.name}</p>
                      <p className="text-sm text-muted-foreground">@{friend.username}</p>
                    </div>
                    {selectedFriends.some(f => f.id === friend.id) && (
                      <div className="p-1 bg-yellow-400 rounded-full">
                        <Plus className="h-3 w-3 text-black" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Selected Friends */}
            {selectedFriends.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground mb-2">Selected friends:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-2 bg-yellow-400/20 text-yellow-400 px-3 py-1 rounded-full text-sm"
                    >
                      <span>{friend.name}</span>
                      <button
                        type="button"
                        onClick={() => handleFriendToggle(friend)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
