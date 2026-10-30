import React from 'react';
import { AlertCircle, VolumeX, Loader2 } from 'lucide-react';

export function YouTubePlayer({
  containerId,
  isReady,
  playbackStatus,
  playerError,
  autoplayBlocked,
  onUnmute,
}) {
  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border theme-border shadow-xl dark:shadow-2xl dark:shadow-black/80 group">
      {/* Container for YouTube iframe API */}
      <div id={containerId} className="w-full h-full" />

      {/* Loading Overlay */}
      {!isReady && !playerError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-nav)] backdrop-blur-sm z-20 transition-colors">
          <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-500 animate-spin mb-3" />
          <p className="text-sm font-semibold theme-text-main">Initializing YouTube Player...</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Connecting to synchronized room stream</p>
        </div>
      )}

      {/* Error State Overlay */}
      {playerError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-nav)] backdrop-blur-md p-6 text-center z-25 transition-colors">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6 text-red-500 dark:text-red-400" />
          </div>
          <h4 className="text-base font-bold theme-text-main mb-1">Playback Error</h4>
          <p className="text-sm text-[var(--text-muted)] max-w-md">{playerError}</p>
          <p className="text-xs text-[var(--text-faint)] mt-3">
            Try pasting a different public YouTube video link using the input above.
          </p>
        </div>
      )}

      {/* Autoplay Blocked Overlay */}
      {autoplayBlocked && (
        <div className="absolute bottom-4 left-4 z-30">
          <button
            onClick={onUnmute}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-lg transition-transform hover:scale-105 cursor-pointer"
          >
            <VolumeX size={16} />
            <span>Click to Enable Audio</span>
          </button>
        </div>
      )}
    </div>
  );
}
