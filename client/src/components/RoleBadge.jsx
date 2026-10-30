import React from 'react';
import { Crown, ShieldCheck, User } from 'lucide-react';

export function RoleBadge({ role, size = 'sm' }) {
  const isSmall = size === 'sm';
  const iconSize = isSmall ? 12 : 14;

  if (role === 'host') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 ${
        isSmall ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
      }`}>
        <Crown size={iconSize} className="text-amber-600 dark:text-amber-400" />
        Host
      </span>
    );
  }

  if (role === 'moderator') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-full border border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ${
        isSmall ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
      }`}>
        <ShieldCheck size={iconSize} className="text-indigo-600 dark:text-indigo-400" />
        Moderator
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 ${
      isSmall ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
    }`}>
      <User size={iconSize} className="text-zinc-500 dark:text-zinc-400" />
      Participant
    </span>
  );
}
