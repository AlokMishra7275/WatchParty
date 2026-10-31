import React from 'react';
import { Check, X, Clock, Hand, Film, Play, Pause, FastForward, ExternalLink } from 'lucide-react';
import { formatTimeAgo, formatDuration } from '../utils/formatters';
import { getYouTubeThumbnail } from '../utils/youtube';

export function ApprovalQueue({
  pendingRequests = [],
  resolvedRequests = [],
  currentUserId,
  canResolve,
  onApprove,
  onReject,
  onRequestNew,
}) {
  const getActionBadge = (action, payload) => {
    switch (action) {
      case 'play':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
            <Play size={10} /> Play
          </span>
        );
      case 'pause':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
            <Pause size={10} /> Pause
          </span>
        );
      case 'seek':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/30">
            <FastForward size={10} /> Seek to {formatDuration(payload?.currentTime)}
          </span>
        );
      case 'change_video':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/30">
            <Film size={10} /> Change Video
          </span>
        );
      default:
        return <span className="text-xs text-zinc-500 dark:text-zinc-400">{action}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full transition-colors duration-200">
      <div className="p-4 border-b theme-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm theme-text-main">Approval Queue</h3>
          {pendingRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              {pendingRequests.length}
            </span>
          )}
        </div>

        <button
          onClick={onRequestNew}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold theme-text-main border theme-border transition-colors cursor-pointer"
        >
          <Hand size={12} className="text-amber-500 dark:text-amber-400" />
          <span>New Request</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Pending Requests */}
        {pendingRequests.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Clock className="w-8 h-8 text-[var(--text-faint)] mx-auto mb-2" />
            <p className="text-sm font-semibold theme-text-main">No pending requests</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Participants can request to change video or playback state.
            </p>
          </div>
        ) : (
          pendingRequests.map((req) => {
            const isSelf = req.requesterId === currentUserId;

            return (
              <div
                key={req.id}
                className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border hover:border-indigo-400/50 transition-all flex flex-col gap-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold theme-text-main">
                    {req.requesterName} {isSelf && <span className="text-[var(--text-muted)] font-normal">(You)</span>}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">{formatTimeAgo(req.createdAt)}</span>
                </div>

                {/* Change Video Details: Thumbnail & URL */}
                {req.action === 'change_video' && req.payload?.videoId && (
                  <div className="flex gap-2.5 p-2 rounded-xl bg-[var(--bg-card)] border theme-border items-center">
                    <div className="relative w-20 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-black/40 border theme-border">
                      <img
                        src={getYouTubeThumbnail(req.payload.videoId)}
                        alt="Video Thumbnail"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Film size={14} className="text-white drop-shadow" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <a
                        href={req.payload.url || `https://www.youtube.com/watch?v=${req.payload.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate"
                        title="Open on YouTube"
                      >
                        <span className="truncate">{req.payload.url || `https://youtu.be/${req.payload.videoId}`}</span>
                        <ExternalLink size={11} className="flex-shrink-0 opacity-70" />
                      </a>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] block mt-0.5">
                        ID: {req.payload.videoId}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-1">
                  <div>{getActionBadge(req.action, req.payload)}</div>

                  {canResolve ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onApprove(req.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-transform active:scale-95 cursor-pointer"
                        title="Accept request"
                      >
                        <Check size={12} />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => onReject(req.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-red-50 dark:hover:bg-red-950/80 text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500/40 border theme-border text-xs font-semibold transition-colors cursor-pointer"
                        title="Reject request"
                      >
                        <X size={12} />
                        <span>Reject</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400/90 italic">
                      Pending Host Review...
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Recently Resolved Requests */}
        {resolvedRequests.length > 0 && (
          <div className="pt-4 border-t theme-border">
            <h4 className="text-xs font-bold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
              Recent Decisions
            </h4>
            <div className="space-y-1.5">
              {resolvedRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-[var(--bg-card-subtle)] text-[var(--text-muted)] border theme-border"
                >
                  <span className="truncate max-w-[140px] font-medium">
                    {req.requesterName} ({req.action.replace('_', ' ')})
                  </span>
                  <span
                    className={`font-bold capitalize text-[10px] px-1.5 py-0.5 rounded ${
                      req.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
