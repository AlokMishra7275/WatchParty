import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Volume2,
  VolumeX,
  Lock,
  Hand,
} from 'lucide-react';

export function PlaybackControls({
  isPlaying,
  currentTime = 0,
  duration = 0,
  canControl,
  isMuted,
  onPlay,
  onPause,
  onSeek,
  onToggleMute,
  onForceResync,
  onRequestAction,
}) {
  const handleSkip = (secondsOffset) => {
    if (!canControl) return;
    const target = Math.max(0, Math.min(duration || 3600, currentTime + secondsOffset));
    onSeek(target);
  };

  return (
    <div className="theme-card border theme-border rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-md transition-colors duration-200">
      {/* Left: Playback Action Controls */}
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        {canControl ? (
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>
        ) : (
          <button
            onClick={() => onRequestAction?.(isPlaying ? 'pause' : 'play')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] text-xs font-semibold border theme-border transition-colors cursor-pointer"
            title="Request host to change playback state"
          >
            <Hand size={14} className="text-amber-500 dark:text-amber-400" />
            <span>Request {isPlaying ? 'Pause' : 'Play'}</span>
          </button>
        )}

        {/* Jump Backward 10s */}
        <button
          onClick={() => handleSkip(-10)}
          disabled={!canControl}
          className={`p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors ${
            !canControl ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          }`}
          title="Rewind 10 seconds"
        >
          <RotateCcw size={16} />
        </button>

        {/* Jump Forward 10s */}
        <button
          onClick={() => handleSkip(10)}
          disabled={!canControl}
          className={`p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors ${
            !canControl ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          }`}
          title="Skip forward 10 seconds"
        >
          <RotateCw size={16} />
        </button>

        {/* Mute/Unmute */}
        <button
          onClick={onToggleMute}
          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={16} className="text-amber-500 dark:text-amber-400" /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Right: Sync & Status */}
      <div className="flex items-center gap-2">
        {!canControl && (
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--bg-card-subtle)] border theme-border text-[11px] text-[var(--text-muted)]">
            <Lock size={12} className="text-[var(--text-muted)]" />
            <span>Host controlled</span>
          </div>
        )}

        {/* Resync Button */}
        <button
          onClick={onForceResync}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] text-xs font-semibold border theme-border transition-all cursor-pointer"
          title="Align exactly with host server timestamp"
        >
          <RefreshCw size={13} className="text-indigo-600 dark:text-indigo-400" />
          <span>Sync with Host</span>
        </button>
      </div>
    </div>
  );
}
