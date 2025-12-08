'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Users, UserPlus, Mail } from 'lucide-react';
import { toast } from 'sonner';

// Optimized components
import { FriendCard } from '@/components/friends/FriendCard';
import { FriendsGridSkeleton } from '@/components/friends/FriendCardSkeleton';

// Lazy load modals - they're not needed on initial render
const AddFriendsModal = dynamic(
  () => import('@/components/friends/AddFriendsModal').then(mod => ({ default: mod.AddFriendsModal })),
  { 
    loading: () => <ModalLoadingFallback />,
    ssr: false 
  }
);

const FriendRequestsModal = dynamic(
  () => import('@/components/friends/FriendRequestsModal').then(mod => ({ default: mod.FriendRequestsModal })),
  { 
    loading: () => <ModalLoadingFallback />,
    ssr: false 
  }
);

const RemoveFriendModal = dynamic(
  () => import('@/components/friends/RemoveFriendModal').then(mod => ({ default: mod.RemoveFriendModal })),
  { 
    loading: () => <ModalLoadingFallback />,
    ssr: false 
  }
);

// Simple loading fallback for modals
function ModalLoadingFallback() {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
    </div>
  );
}

export default function FriendsPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  
  // Modal states
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false);
  const [showRemoveFriendModal, setShowRemoveFriendModal] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState(null);

  // Auth check
  const checkAuth = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      router.push('/sign-in');
      return null;
    }
    setUser(session.user);
    return session.user;
  }, [supabase, router]);

  // Load friends with cache-busting
  const loadFriends = useCallback(async () => {
    try {
      const response = await fetch('/api/friends', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await response.json();
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch {
      toast.error("Couldn't load your friends. Please refresh the page.");
    }
  }, []);

  // Load pending requests count
  const loadPendingRequestsCount = useCallback(async () => {
    try {
      const response = await fetch('/api/friends/requests', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await response.json();
      if (data.success) {
        setPendingRequestsCount(data.received?.length || 0);
      }
    } catch {
      // Silently fail - not critical
    }
  }, []);

  // Initial load - parallel fetching
  useEffect(() => {
    async function init() {
      setLoading(true);
      const authenticatedUser = await checkAuth();
      if (authenticatedUser) {
        // Fetch both in parallel for faster load
        await Promise.all([
          loadFriends(),
          loadPendingRequestsCount()
        ]);
      }
      setLoading(false);
    }
    init();
  }, [checkAuth, loadFriends, loadPendingRequestsCount]);

  // Handlers
  const handleRemoveFriend = useCallback((friend) => {
    setFriendToRemove(friend);
    setShowRemoveFriendModal(true);
  }, []);

  const confirmRemoveFriend = useCallback(async () => {
    if (!friendToRemove) return;
    
    const removedFriendId = friendToRemove.id;
    const previousFriends = friends;
    
    // Optimistic UI update
    setFriends(prev => prev.filter(f => f.id !== removedFriendId));
    setShowRemoveFriendModal(false);
    setFriendToRemove(null);
    
    try {
      const response = await fetch('/api/friends', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: removedFriendId }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Friend removed');
      } else {
        setFriends(previousFriends);
        toast.error(data.error || "Couldn't remove this friend. Please try again.");
      }
    } catch {
      setFriends(previousFriends);
      toast.error("Couldn't connect to the server. Please check your internet.");
    }
  }, [friendToRemove, friends]);

  const cancelRemoveFriend = useCallback(() => {
    setShowRemoveFriendModal(false);
    setFriendToRemove(null);
  }, []);

  const handleModalClose = useCallback((type) => {
    if (type === 'add') {
      setShowAddFriendsModal(false);
    } else {
      setShowFriendRequestsModal(false);
    }
    // Refresh data after modal closes
    loadFriends();
    loadPendingRequestsCount();
  }, [loadFriends, loadPendingRequestsCount]);

  const handleRequestsChanged = useCallback(() => {
    loadFriends();
    loadPendingRequestsCount();
  }, [loadFriends, loadPendingRequestsCount]);

  // Initial loading state with skeleton
  if (loading && !user) {
    return (
      <div className="min-h-screen text-[var(--foreground)]">
        <HeaderSkeleton />
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
          <FriendsGridSkeleton count={6} />
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
                Manage your friends and see what they&apos;re listening to
              </p>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">
                {loading ? (
                  <span className="inline-block w-20 h-4 bg-[var(--muted-foreground)]/20 rounded animate-pulse" />
                ) : (
                  `${friends.length} friend${friends.length !== 1 ? 's' : ''}`
                )}
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
          <FriendsGridSkeleton count={6} />
        ) : friends.length === 0 ? (
          <EmptyFriendsState onAddFriends={() => setShowAddFriendsModal(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {friends.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onRemove={handleRemoveFriend}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lazy-loaded Modals */}
      {showAddFriendsModal && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <AddFriendsModal onClose={() => handleModalClose('add')} />
        </Suspense>
      )}

      {showFriendRequestsModal && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <FriendRequestsModal
            onClose={() => handleModalClose('requests')}
            onRequestsChanged={handleRequestsChanged}
          />
        </Suspense>
      )}

      {showRemoveFriendModal && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <RemoveFriendModal
            friend={friendToRemove}
            onConfirm={confirmRemoveFriend}
            onCancel={cancelRemoveFriend}
          />
        </Suspense>
      )}
    </div>
  );
}

// Header skeleton for initial load
function HeaderSkeleton() {
  return (
    <div className="border-b border-[var(--glass-border)]">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-7 bg-[var(--muted-foreground)]/20 rounded w-32" />
            <div className="h-4 bg-[var(--muted-foreground)]/20 rounded w-64" />
            <div className="h-4 bg-[var(--muted-foreground)]/20 rounded w-20" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 bg-[var(--muted-foreground)]/20 rounded-lg w-28" />
            <div className="h-10 bg-[var(--muted-foreground)]/20 rounded-lg w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyFriendsState({ onAddFriends }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 text-center px-4">
      <Users className="h-12 w-12 sm:h-16 sm:w-16 text-[var(--muted-foreground)] mb-4" aria-hidden="true" />
      <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-[var(--foreground)]">No friends yet</h2>
      <p className="text-[var(--muted-foreground)] mb-6 text-sm sm:text-base max-w-md">
        Start connecting with friends to share music and see what they&apos;re listening to
      </p>
      <button
        onClick={onAddFriends}
        className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 btn-primary rounded-lg text-sm sm:text-base"
      >
        <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
        Add Your First Friend
      </button>
    </div>
  );
}
