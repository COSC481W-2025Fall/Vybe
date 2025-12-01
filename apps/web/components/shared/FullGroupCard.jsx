'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function FullGroupCard({ group, isOwner, onClick }) {
  const [members, setMembers] = useState([]);
  const supabase = supabaseBrowser();

  useEffect(() => {
    async function loadMembers() {
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
      className="glass-card rounded-xl p-4 hover:bg-white/5 [data-theme='light']:hover:bg-black/5 active:bg-white/5 [data-theme='light']:active:bg-black/5 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-[var(--foreground)] truncate">{group.name}</h3>
        {isOwner ? (
          <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-xs font-medium border border-purple-500/30">
            Owner
          </span>
        ) : (
          <span className="px-3 py-1 bg-white/5 [data-theme='light']:bg-black/5 border border-white/10 [data-theme='light']:border-black/10 text-[var(--muted-foreground)] rounded-full text-xs font-medium">
            Public
          </span>
        )}
      </div>

      <p className="text-sm text-[var(--muted-foreground)] mb-4 line-clamp-2">
        {group.description || 'No description'}
      </p>

      <div className="flex items-center gap-6 mb-4 text-sm text-[var(--muted-foreground)]">
        <span>{group.memberCount || 1} members</span>
        <span>{group.songCount || 0} songs</span>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Created {formattedDate}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {displayMembers.map((member, index) => (
            <div
              key={member?.id || index}
              className="w-8 h-8 rounded-full border-2 border-gray-900 overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500"
              title={member?.username || 'Member'}
            >
              {member?.profile_picture_url ? (
                <img src={member.profile_picture_url} alt={member.username || 'Member'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--foreground)] text-xs font-semibold">
                  {member?.username?.[0]?.toUpperCase() || 'M'}
                </div>
              )}
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="w-8 h-8 rounded-full bg-white/10 [data-theme='light']:bg-black/10 border-2 border-gray-900 [data-theme='light']:border-gray-100 flex items-center justify-center text-[var(--foreground)] text-xs">
              +{remainingCount}
            </div>
          )}
        </div>

        <div className="px-3 py-1.5 bg-white/5 [data-theme='light']:bg-black/5 border border-white/10 [data-theme='light']:border-black/10 rounded-md text-[var(--muted-foreground)] text-sm font-mono font-semibold">
          {group.join_code || 'GENERATING...'}
        </div>
      </div>
    </div>
  );
}


