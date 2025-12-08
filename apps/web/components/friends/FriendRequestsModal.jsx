'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { Mail, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Modal showing incoming and outgoing friend requests
 * Extracted for lazy loading
 */
function FriendRequestsModalComponent({ onClose, onRequestsChanged }) {
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/friends/requests', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await response.json();
      if (data.success) {
        setReceivedRequests(data.received || []);
        setSentRequests(data.sent || []);
      }
    } catch {
      toast.error("Couldn't load friend requests. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleAccept = useCallback(async (friendshipId, userName) => {
    const previousReceived = [...receivedRequests];
    setReceivedRequests(prev => prev.filter(r => r.friendship_id !== friendshipId));
    
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'accept' }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`You're now friends with ${userName}! 🎉`);
        onRequestsChanged?.();
      } else {
        setReceivedRequests(previousReceived);
        toast.error(data.error || "Couldn't accept the request. Please try again.");
      }
    } catch {
      setReceivedRequests(previousReceived);
      toast.error("Couldn't connect to the server. Please check your internet.");
    }
  }, [receivedRequests, onRequestsChanged]);

  const handleReject = useCallback(async (friendshipId, userName) => {
    const previousReceived = [...receivedRequests];
    setReceivedRequests(prev => prev.filter(r => r.friendship_id !== friendshipId));
    
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'reject' }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Declined request from ${userName}`);
        onRequestsChanged?.();
      } else {
        setReceivedRequests(previousReceived);
        toast.error(data.error || "Couldn't decline the request. Please try again.");
      }
    } catch {
      setReceivedRequests(previousReceived);
      toast.error("Couldn't connect to the server. Please check your internet.");
    }
  }, [receivedRequests, onRequestsChanged]);

  const handleCancelSent = useCallback(async (friendshipId, userName) => {
    const previousSent = [...sentRequests];
    setSentRequests(prev => prev.filter(r => r.friendship_id !== friendshipId));
    
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'cancel' }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Cancelled request to ${userName}`);
        onRequestsChanged?.();
      } else {
        setSentRequests(previousSent);
        toast.error(data.error || "Couldn't cancel the request. Please try again.");
      }
    } catch {
      setSentRequests(previousSent);
      toast.error("Couldn't connect to the server. Please check your internet.");
    }
  }, [sentRequests, onRequestsChanged]);

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
            <RequestsSkeleton />
          ) : activeTab === 'received' ? (
            receivedRequests.length === 0 ? (
              <EmptyState icon={Mail} message="No incoming requests" />
            ) : (
              receivedRequests.map((request) => (
                <ReceivedRequestCard
                  key={request.friendship_id}
                  request={request}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ))
            )
          ) : (
            sentRequests.length === 0 ? (
              <EmptyState 
                icon={UserPlus} 
                message="No pending requests" 
                subtitle="Requests you send will appear here"
              />
            ) : (
              sentRequests.map((request) => (
                <SentRequestCard
                  key={request.friendship_id}
                  request={request}
                  onCancel={handleCancelSent}
                />
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Fixed height for request cards to prevent CLS
const REQUEST_CARD_HEIGHT = 'min-h-[56px] sm:min-h-[60px]';

// Skeleton for loading state - MUST match card dimensions
const RequestsSkeleton = memo(function RequestsSkeleton() {
  return (
    <div className="space-y-2" style={{ contain: 'layout' }}>
      {[1, 2, 3].map((i) => (
        <div 
          key={i} 
          className={`flex items-center gap-3 p-2.5 sm:p-3 bg-[var(--secondary-bg)] rounded-lg animate-pulse ${REQUEST_CARD_HEIGHT}`}
        >
          <div className="w-10 h-10 rounded-full bg-[var(--muted-foreground)]/20 flex-shrink-0" style={{ aspectRatio: '1/1' }} />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-4 bg-[var(--muted-foreground)]/20 rounded w-24 max-w-full" />
            <div className="h-3 bg-[var(--muted-foreground)]/20 rounded w-16 max-w-full" />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <div className="w-16 h-7 bg-[var(--muted-foreground)]/20 rounded-lg" />
            <div className="w-16 h-7 bg-[var(--muted-foreground)]/20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
});

// Empty state component - fixed height to prevent CLS
const EmptyState = memo(function EmptyState({ icon: Icon, message, subtitle }) {
  return (
    <div className="text-center py-8 sm:py-12 min-h-[200px] flex flex-col items-center justify-center">
      <Icon className="h-12 w-12 sm:h-16 sm:w-16 text-[var(--muted-foreground)] mb-4 flex-shrink-0" aria-hidden="true" />
      <p className="text-[var(--muted-foreground)] text-sm sm:text-base">{message}</p>
      {subtitle && <p className="text-xs text-[var(--muted-foreground)] mt-1">{subtitle}</p>}
    </div>
  );
});

// Received request card - fixed height
const ReceivedRequestCard = memo(function ReceivedRequestCard({ request, onAccept, onReject }) {
  return (
    <div
      className={`flex items-center justify-between p-2.5 sm:p-3 bg-[var(--secondary-bg)] rounded-lg border border-[var(--glass-border)] gap-2 ${REQUEST_CARD_HEIGHT}`}
      role="listitem"
      style={{ contain: 'layout' }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div 
          className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold flex-shrink-0"
          style={{ aspectRatio: '1/1' }}
        >
          <span aria-hidden="true">
            {request.name?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[var(--foreground)] font-medium text-sm truncate leading-4 h-4">
            {request.name || 'Unknown User'}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] truncate leading-3 h-3 mt-1">
            @{request.username || 'unknown'}
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => onAccept(request.friendship_id, request.name)}
          className="px-3 h-7 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs sm:text-sm transition-colors flex items-center justify-center"
          aria-label={`Accept friend request from ${request.name}`}
        >
          Accept
        </button>
        <button
          onClick={() => onReject(request.friendship_id, request.name)}
          className="px-3 h-7 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-xs sm:text-sm transition-colors flex items-center justify-center"
          aria-label={`Decline friend request from ${request.name}`}
        >
          Decline
        </button>
      </div>
    </div>
  );
});

// Sent request card - slightly taller due to extra line
const SENT_CARD_HEIGHT = 'min-h-[68px] sm:min-h-[72px]';

const SentRequestCard = memo(function SentRequestCard({ request, onCancel }) {
  return (
    <div
      className={`flex items-center justify-between p-2.5 sm:p-3 bg-[var(--secondary-bg)] rounded-lg border border-yellow-500/20 gap-2 ${SENT_CARD_HEIGHT}`}
      role="listitem"
      style={{ contain: 'layout' }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div 
          className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white font-semibold flex-shrink-0"
          style={{ aspectRatio: '1/1' }}
        >
          <span aria-hidden="true">
            {request.name?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[var(--foreground)] font-medium text-sm truncate leading-4 h-4">
            {request.name || 'Unknown User'}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] truncate leading-3 h-3 mt-0.5">
            @{request.username || 'unknown'}
          </p>
          <p className="text-xs text-yellow-400 leading-3 h-3 mt-0.5">Waiting for response...</p>
        </div>
      </div>
      <button
        onClick={() => onCancel(request.friendship_id, request.name)}
        className="px-3 h-7 bg-[var(--secondary-bg)] hover:bg-red-500/20 text-[var(--muted-foreground)] hover:text-red-400 border border-[var(--glass-border)] hover:border-red-500/30 rounded-lg text-xs sm:text-sm transition-colors flex items-center justify-center flex-shrink-0"
        aria-label={`Cancel friend request to ${request.name}`}
      >
        Cancel
      </button>
    </div>
  );
});

export const FriendRequestsModal = memo(FriendRequestsModalComponent);
