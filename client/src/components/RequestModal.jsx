import React, { useState } from 'react';
import { X, Film, Play, Pause, FastForward, AlertCircle } from 'lucide-react';
import { extractYouTubeVideoId } from '../utils/youtube';

export function RequestModal({ isOpen, onClose, onSubmitRequest, currentDuration = 0 }) {
  const [actionType, setActionType] = useState('change_video');
  const [videoUrl, setVideoUrl] = useState('');
  const [seekMinutes, setSeekMinutes] = useState('0');
  const [seekSeconds, setSeekSeconds] = useState('0');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let payload = {};

    if (actionType === 'change_video') {
      const validation = extractYouTubeVideoId(videoUrl);
      if (!validation.valid) {
        setError(validation.error || 'Please provide a valid YouTube link');
        return;
      }
      payload = { url: videoUrl, videoId: validation.videoId };
    } else if (actionType === 'seek') {
      const mins = parseInt(seekMinutes, 10) || 0;
      const secs = parseInt(seekSeconds, 10) || 0;
      const totalSecs = mins * 60 + secs;
      if (totalSecs < 0) {
        setError('Seek time cannot be negative');
        return;
      }
      payload = { currentTime: totalSecs };
    }

    setIsSubmitting(true);
    const result = await onSubmitRequest(actionType, payload);
    setIsSubmitting(false);

    if (result && result.success) {
      onClose();
    } else {
      setError(result?.error || 'Failed to submit request');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="theme-card border theme-border rounded-3xl w-full max-w-md p-6 shadow-2xl relative transition-colors duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <h3 className="text-lg font-bold theme-text-main mb-1">Request Playback Action</h3>
        <p className="text-xs text-[var(--text-muted)] mb-5">
          As a participant, your request will be reviewed by the Host or Moderator.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Type Select */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setActionType('change_video'); setError(''); }}
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                actionType === 'change_video'
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                  : 'bg-[var(--bg-card-subtle)] border theme-border text-[var(--text-muted)] hover:border-indigo-400/50'
              }`}
            >
              <Film size={14} />
              <span>Change Video</span>
            </button>

            <button
              type="button"
              onClick={() => { setActionType('play'); setError(''); }}
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                actionType === 'play'
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                  : 'bg-[var(--bg-card-subtle)] border theme-border text-[var(--text-muted)] hover:border-indigo-400/50'
              }`}
            >
              <Play size={14} />
              <span>Play Video</span>
            </button>

            <button
              type="button"
              onClick={() => { setActionType('pause'); setError(''); }}
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                actionType === 'pause'
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                  : 'bg-[var(--bg-card-subtle)] border theme-border text-[var(--text-muted)] hover:border-indigo-400/50'
              }`}
            >
              <Pause size={14} />
              <span>Pause Video</span>
            </button>

            <button
              type="button"
              onClick={() => { setActionType('seek'); setError(''); }}
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                actionType === 'seek'
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                  : 'bg-[var(--bg-card-subtle)] border theme-border text-[var(--text-muted)] hover:border-indigo-400/50'
              }`}
            >
              <FastForward size={14} />
              <span>Seek to Time</span>
            </button>
          </div>

          {/* Conditional inputs */}
          {actionType === 'change_video' && (
            <div>
              <label className="block text-xs font-semibold theme-text-main mb-1.5">
                YouTube Video Link or ID
              </label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
                className="theme-input w-full px-3.5 py-2.5 rounded-xl border text-sm placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
              />
            </div>
          )}

          {actionType === 'seek' && (
            <div>
              <label className="block text-xs font-semibold theme-text-main mb-1.5">
                Target Timestamp
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={seekMinutes}
                  onChange={(e) => setSeekMinutes(e.target.value)}
                  placeholder="Min"
                  className="theme-input w-1/2 px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
                />
                <span className="text-[var(--text-muted)]">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seekSeconds}
                  onChange={(e) => setSeekSeconds(e.target.value)}
                  placeholder="Sec"
                  className="theme-input w-1/2 px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] border theme-border transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Sending...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
