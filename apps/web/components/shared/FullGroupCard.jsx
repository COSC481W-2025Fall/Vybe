'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Users, Music, Calendar, Copy, Check } from 'lucide-react';

export default function FullGroupCard({ group, isOwner, onClick }) {
  const [members, setMembers] = useState([]);
  const [copied, setCopied] = useState(false);
  const supabase = supabaseBrowser();

  const handleCopyCode = (e) => {
    e.stopPropagation(); // Prevent card click
    if (group.join_code) {
      navigator.clipboard.writeText(group.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    async function loadMembers() {
      // Guard against missing group data
      if (!group?.id || !group?.owner_id) {
        return;
      }

      const { data: owner } = await supabase
        .from('users')
        .select('id, username, profile_picture_url')
        .eq('id', group.owner_id)
        .single();

      const { data: groupMembers } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', group.id)
        .limit(2);

      if (groupMembers && groupMembers.length > 0) {
        const memberIds = groupMembers.map(m => m.user_id).filter(Boolean);
        if (memberIds.length > 0) {
          const { data: memberUsers } = await supabase
            .from('users')
            .select('id, username, profile_picture_url')
            .in('id', memberIds);
          setMembers([owner, ...(memberUsers || [])].filter(Boolean));
        } else {
          setMembers(owner ? [owner] : []);
        }
      } else {
        setMembers(owner ? [owner] : []);
      }
    }
    loadMembers();
  }, [group?.id, group?.owner_id]);

  const formattedDate = new Date(group.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  const displayMembers = members.slice(0, 3);
  const remainingCount = Math.max(0, (group.memberCount || 0) - displayMembers.length);

  return (
    <div
      onClick={onClick}
      className="glass-card rounded-xl p-4 hover:bg-[var(--secondary-hover)] transition-all cursor-pointer h-[200px] flex flex-col"
    >
      {/* Header - fixed */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm sm:text-base font-semibold text-[var(--foreground)] truncate flex-1">
          {group.name}
        </h3>
        {isOwner ? (
          <span className="px-2 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] rounded-full text-xs font-medium border border-[var(--accent)]/30 flex-shrink-0">
            Owner
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-[var(--secondary-bg)] border border-[var(--glass-border)] rounded-full text-xs text-[var(--muted-foreground)] flex-shrink-0">
            Public
          </span>
        )}
      </div>

      {/* Description - flexible */}
      <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 flex-1 min-h-[32px]">
        {group.description || 'No description'}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] mb-3">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {group.memberCount || 1}
        </span>
        <span className="flex items-center gap-1">
          <Music className="w-3 h-3" />
          {group.songCount || 0}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formattedDate}
        </span>
      </div>

      {/* Footer - fixed */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--glass-border)] mt-auto">
        {/* Member Avatars */}
        <div className="flex -space-x-2">
          {displayMembers.map((member, index) => (
            <div
              key={member?.id || index}
              className="w-7 h-7 rounded-full border-2 border-[var(--background)] overflow-hidden bg-gradient-to-br from-[var(--accent)] to-pink-500"
              title={member?.username || 'Member'}
            >
              {member?.profile_picture_url ? (
                <img src={member.profile_picture_url} alt={member.username || 'Member'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xs font-semibold">
                  {member?.username?.[0]?.toUpperCase() || 'M'}
                </div>
              )}
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="w-7 h-7 rounded-full bg-[var(--secondary-bg)] border-2 border-[var(--background)] flex items-center justify-center text-[var(--muted-foreground)] text-xs">
              +{remainingCount}
            </div>
          )}
        </div>

        {/* Join Code - Copyable */}
        <button
          onClick={handleCopyCode}
          title={copied ? 'Copied!' : 'Click to copy join code'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all min-h-[28px] ${
            copied 
              ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
              : 'bg-[var(--secondary-bg)] border border-[var(--glass-border)] text-[var(--muted-foreground)] hover:bg-[var(--secondary-hover)] hover:border-[var(--accent)]/30 active:bg-[var(--secondary-hover)]'
          }`}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <Copy className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <span className="truncate">{group.join_code || '...'}</span>
        </button>
      </div>
    </div>
  );
}


