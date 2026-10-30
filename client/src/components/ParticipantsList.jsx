import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, UserMinus } from 'lucide-react';
import { RoleBadge } from './RoleBadge';

export function ParticipantsList({
  participants = [],
  currentUserId,
  isHost,
  onAssignRole,
  onRemoveParticipant,
}) {
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  return (
    <div className="flex flex-col h-full transition-colors duration-200">
      <div className="p-4 border-b theme-border flex items-center justify-between">
        <h3 className="font-bold text-sm theme-text-main">Room Participants</h3>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--bg-card-subtle)] text-[var(--text-muted)] border theme-border">
          {participants.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {participants.map((p) => {
          const isSelf = p.id === currentUserId;
          const isUserMod = p.role === 'moderator';

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                isSelf
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-500/30'
                  : 'bg-[var(--bg-card-subtle)] border theme-border hover:border-indigo-400/50'
              }`}
            >
              {/* Left: Avatar & Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-card)] flex items-center justify-center font-bold text-sm theme-text-main border theme-border shadow-sm">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950"
                    title="Online"
                  />
                </div>

                <div className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold theme-text-main truncate">
                      {p.name}
                    </span>
                    {isSelf && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-[var(--bg-card)] text-[var(--text-muted)] rounded border theme-border">
                        You
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5">
                    <RoleBadge role={p.role} size="sm" />
                  </div>
                </div>
              </div>

              {/* Right: Host Actions (Cannot act on self) */}
              {isHost && !isSelf && (
                <div className="relative flex items-center gap-1">
                  {confirmRemoveId === p.id ? (
                    <div className="flex items-center gap-1 theme-card border border-red-500/40 p-1 rounded-lg shadow-sm">
                      <span className="text-[10px] text-red-600 dark:text-red-400 font-bold px-1">Remove?</span>
                      <button
                        onClick={() => {
                          onRemoveParticipant(p.id);
                          setConfirmRemoveId(null);
                        }}
                        className="px-1.5 py-0.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        className="px-1.5 py-0.5 bg-[var(--bg-card-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-[10px] rounded cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Promote/Demote quick button */}
                      {isUserMod ? (
                        <button
                          onClick={() => onAssignRole(p.id, 'participant')}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-amber-600 dark:hover:text-amber-400 hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                          title="Demote to Participant"
                        >
                          <ShieldAlert size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => onAssignRole(p.id, 'moderator')}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                          title="Promote to Moderator"
                        >
                          <ShieldCheck size={14} />
                        </button>
                      )}

                      {/* Remove Button */}
                      <button
                        onClick={() => setConfirmRemoveId(p.id)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                        title="Remove participant from room"
                      >
                        <UserMinus size={14} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
