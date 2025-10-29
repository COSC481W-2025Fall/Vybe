// components/FriendRequestsModal.jsx
'use client';

import { Check, Mail, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function FriendRequestsModal({ onClose }) {
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/friends/requests');
      const data = await response.json();
      
      if (data.success) {
        setSent(data.sent || []);
        setReceived(data.received || []);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (friendshipId) => {
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          friendshipId, 
          action: 'accept' 
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        fetchRequests(); // Refresh
      } else {
        alert(data.error || 'Failed to accept request');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const handleReject = async (friendshipId) => {
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          friendshipId, 
          action: 'reject' 
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        fetchRequests(); // Refresh
      } else {
        alert(data.error || 'Failed to reject request');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="vybe-aurora bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-400/20 rounded-lg">
              <Mail className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Friend Requests</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Received Requests */}
            <div>
              <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Received ({received.length})
              </h3>
              {received.length > 0 ? (
                <div className="space-y-2">
                  {received.map((request) => (
                    <div
                      key={request.friendship_id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div>
                        <p className="text-white font-medium">{request.name}</p>
                        <p className="text-sm text-muted-foreground">@{request.username}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(request.friendship_id)}
                          className="p-2 bg-green-400/20 hover:bg-green-400/30 rounded-lg transition-colors"
                          title="Accept"
                        >
                          <Check className="h-4 w-4 text-green-400" />
                        </button>
                        <button
                          onClick={() => handleReject(request.friendship_id)}
                          className="p-2 bg-red-400/20 hover:bg-red-400/30 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <X className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pending requests</p>
              )}
            </div>

            {/* Sent Requests */}
            <div>
              <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Sent ({sent.length})
              </h3>
              {sent.length > 0 ? (
                <div className="space-y-2">
                  {sent.map((request) => (
                    <div
                      key={request.friendship_id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div>
                        <p className="text-white font-medium">{request.name}</p>
                        <p className="text-sm text-muted-foreground">@{request.username}</p>
                      </div>
                      <span className="px-3 py-1 bg-yellow-400/20 text-yellow-400 rounded-lg text-sm">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No sent requests</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

