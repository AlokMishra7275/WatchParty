import { useEffect, useRef, useState, useCallback } from 'react';
import { extractYouTubeVideoId } from '../utils/youtube';

let ytApiPromise = null;

/**
 * Robust YouTube IFrame API script loader.
 * Reuses a single promise across callers and handles timeouts/errors cleanly.
 */
function loadYouTubeApi() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not defined'));
  }

  // Already loaded and constructor available
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  // Return existing in-flight loader promise
  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }

    // Preserve existing callback if another module set one
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === 'function') {
        try {
          prevReady();
        } catch (e) {
          console.warn('Previous onYouTubeIframeAPIReady error:', e);
        }
      }
      if (window.YT && window.YT.Player) {
        resolve(window.YT);
      }
    };

    // Inject YouTube IFrame API script if not already present
    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        ytApiPromise = null;
        reject(new Error('Failed to load YouTube API script. Please check your network or ad blocker.'));
      };
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    // Polling fallback in case onYouTubeIframeAPIReady event was missed
    const pollInterval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(pollInterval);
        clearTimeout(timeoutId);
        resolve(window.YT);
      }
    }, 50);

    // Timeout safety
    const timeoutId = setTimeout(() => {
      clearInterval(pollInterval);
      if (window.YT && window.YT.Player) {
        resolve(window.YT);
      } else {
        ytApiPromise = null;
        reject(new Error('YouTube API initialization timed out. Please check your connection and refresh.'));
      }
    }, 12000);
  });

  return ytApiPromise;
}

function sanitizeVideoId(input) {
  if (!input) return 'dQw4w9WgXcQ';
  const val = extractYouTubeVideoId(input);
  return val.valid && val.videoId ? val.videoId : 'dQw4w9WgXcQ';
}

/**
 * Calculates authoritative playback timestamp using elapsed server time
 */
function computeAuthoritativeTime(playback) {
  if (!playback) return 0;
  const {
    currentTime = 0,
    isPlaying,
    status,
    serverTimestamp,
    updatedAt,
    lastUpdated,
    playbackRate = 1,
  } = playback;

  const isCurrentlyPlaying = isPlaying !== undefined ? isPlaying : status === 'playing';
  if (!isCurrentlyPlaying) {
    return Math.max(0, currentTime);
  }

  const refTime = serverTimestamp || updatedAt || lastUpdated;
  if (refTime) {
    const elapsedSeconds = Math.max(0, (Date.now() - refTime) / 1000);
    return Math.max(0, currentTime + elapsedSeconds * playbackRate);
  }

  return Math.max(0, currentTime);
}

/**
 * YouTube IFrame API Hook
 * Enforces host-authoritative playback synchronization, drift correction,
 * and eliminates duplicate controls while preventing feedback loops.
 */
export function useYouTubePlayer({
  containerId = 'yt-player-host',
  initialVideoId,
  canControl,
  enabled = true,
  onUserPlay,
  onUserPause,
  onUserSeek,
}) {
  const playerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [playerState, setPlayerState] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playerError, setPlayerError] = useState(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Flags to prevent synchronization feedback loops
  const isProgrammaticUpdate = useRef(false);
  const currentVideoIdRef = useRef(sanitizeVideoId(initialVideoId));
  const lastSyncPlaybackRef = useRef(null);
  const pendingSyncRef = useRef(null);

  // Time tracking for detecting native seek bar scrubbing by host
  const lastObservedTime = useRef(0);
  const lastTickTime = useRef(Date.now());

  useEffect(() => {
    if (initialVideoId) {
      currentVideoIdRef.current = sanitizeVideoId(initialVideoId);
    }
  }, [initialVideoId]);

  // Keep fresh references to avoid stale closures in player callbacks
  const canControlRef = useRef(canControl);
  const onUserPlayRef = useRef(onUserPlay);
  const onUserPauseRef = useRef(onUserPause);
  const onUserSeekRef = useRef(onUserSeek);

  useEffect(() => {
    canControlRef.current = canControl;
    onUserPlayRef.current = onUserPlay;
    onUserPauseRef.current = onUserPause;
    onUserSeekRef.current = onUserSeek;
  }, [canControl, onUserPlay, onUserPause, onUserSeek]);

  // Internal apply sync helper
  const applySyncToPlayer = useCallback((playback) => {
    const player = playerRef.current;
    if (!player || typeof player.getPlayerState !== 'function') {
      pendingSyncRef.current = playback;
      return;
    }

    lastSyncPlaybackRef.current = playback;
    const { videoId, status, isPlaying } = playback;
    const isCurrentlyPlaying = isPlaying !== undefined ? isPlaying : status === 'playing';
    const targetTime = computeAuthoritativeTime(playback);

    const cleanTargetVideoId = sanitizeVideoId(videoId);

    // 1. Video ID check
    if (cleanTargetVideoId && cleanTargetVideoId !== currentVideoIdRef.current) {
      currentVideoIdRef.current = cleanTargetVideoId;
      isProgrammaticUpdate.current = true;
      setPlayerError(null);
      try {
        if (isCurrentlyPlaying) {
          player.loadVideoById({ videoId: cleanTargetVideoId, startSeconds: targetTime });
        } else {
          player.cueVideoById({ videoId: cleanTargetVideoId, startSeconds: targetTime });
        }
      } catch (e) {
        console.warn('Error loading video by ID:', e);
      }
      return;
    }

    // 2. Play / Pause status check
    const currentYTState = player.getPlayerState ? player.getPlayerState() : -1;
    const isLocalPlaying = currentYTState === (window.YT?.PlayerState?.PLAYING || 1);

    if (isCurrentlyPlaying && !isLocalPlaying) {
      isProgrammaticUpdate.current = true;
      try {
        player.playVideo();
      } catch (e) {
        console.warn('Error playing video:', e);
      }
    } else if (!isCurrentlyPlaying && isLocalPlaying) {
      isProgrammaticUpdate.current = true;
      try {
        player.pauseVideo();
      } catch (e) {
        console.warn('Error pausing video:', e);
      }
    }

    // 3. Drift check
    const localTime = player.getCurrentTime ? player.getCurrentTime() : 0;
    const drift = localTime - targetTime;
    const absDrift = Math.abs(drift);

    if (absDrift > 1.5) {
      // Large drift: seek directly to authoritative timestamp
      isProgrammaticUpdate.current = true;
      try {
        player.seekTo(targetTime, true);
        if (typeof player.setPlaybackRate === 'function' && player.getPlaybackRate() !== 1) {
          player.setPlaybackRate(1);
        }
      } catch (e) {
        console.warn('Error seeking video:', e);
      }
    } else if (absDrift > 0.4 && isCurrentlyPlaying) {
      // Small drift: gradually correct playback rate if supported
      if (typeof player.setPlaybackRate === 'function') {
        try {
          if (drift < -0.4) {
            // Local player is behind host: speed up slightly
            player.setPlaybackRate(1.25);
          } else if (drift > 0.4) {
            // Local player is ahead of host: slow down slightly
            player.setPlaybackRate(0.75);
          }
        } catch (e) {
          console.warn('Error setting playback rate:', e);
        }
      }
    } else if (absDrift <= 0.3) {
      // In sync: restore standard rate
      if (typeof player.setPlaybackRate === 'function') {
        try {
          if (player.getPlaybackRate() !== 1) player.setPlaybackRate(1);
        } catch (e) {
          // ignore
        }
      }
    }
  }, []);

  // 1. Load YouTube IFrame Script and Initialize Player
  useEffect(() => {
    if (!enabled) return;

    let isCancelled = false;

    async function init() {
      try {
        await loadYouTubeApi();
      } catch (loadErr) {
        if (isCancelled) return;
        console.error('YouTube API script loading error:', loadErr);
        setPlayerError(loadErr.message || 'Failed to load YouTube API script');
        setIsReady(true);
        return;
      }

      if (isCancelled) return;

      // Locate host container in DOM
      let hostEl = document.getElementById(containerId);
      let retries = 0;
      while (!hostEl && retries < 40) {
        await new Promise((r) => setTimeout(r, 50));
        if (isCancelled) return;
        hostEl = document.getElementById(containerId);
        retries++;
      }

      if (!hostEl || isCancelled) {
        if (!isCancelled) {
          console.warn('Could not locate player container in DOM:', containerId);
        }
        return;
      }

      // If an existing player instance exists, destroy it before recreating
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying existing player:', e);
        }
        playerRef.current = null;
      }

      // Clear the host container so no stale iframes exist
      hostEl.innerHTML = '';

      // Create a fresh child slot element for YouTube to replace with its iframe
      const mountSlot = document.createElement('div');
      mountSlot.className = 'w-full h-full';
      hostEl.appendChild(mountSlot);

      const targetVideoId = currentVideoIdRef.current || 'dQw4w9WgXcQ';

      try {
        playerRef.current = new window.YT.Player(mountSlot, {
          height: '100%',
          width: '100%',
          videoId: targetVideoId,
          playerVars: {
            autoplay: 1,
            controls: 1, // Keep YouTube native player controls and native timer visible
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin || undefined,
          },
          events: {
            onReady: (event) => {
              if (isCancelled) return;
              setIsReady(true);
              setPlayerError(null);
              setDuration(event.target.getDuration ? event.target.getDuration() : 0);

              // Apply any pending sync received before player was ready
              if (pendingSyncRef.current) {
                const pending = pendingSyncRef.current;
                pendingSyncRef.current = null;
                applySyncToPlayer(pending);
              }
            },
            onStateChange: (event) => {
              if (isCancelled) return;
              const state = event.data;
              setPlayerState(state);

              if (event.target.getDuration) {
                setDuration(event.target.getDuration());
              }

              // If triggered programmatically by socket sync, ignore to prevent feedback loops
              if (isProgrammaticUpdate.current) {
                isProgrammaticUpdate.current = false;
                return;
              }

              const nowTime = event.target.getCurrentTime ? event.target.getCurrentTime() : 0;

              // If Host or Moderator: broadcast playback action to room
              if (canControlRef.current) {
                if (state === window.YT.PlayerState.PLAYING) {
                  onUserPlayRef.current?.(nowTime);
                } else if (state === window.YT.PlayerState.PAUSED) {
                  onUserPauseRef.current?.(nowTime);
                }
              } else {
                // Non-host participant tried to play or pause locally:
                // Revert participant's player to match authoritative room state
                if (lastSyncPlaybackRef.current) {
                  const targetTime = computeAuthoritativeTime(lastSyncPlaybackRef.current);
                  const shouldBePlaying = lastSyncPlaybackRef.current.isPlaying !== undefined
                    ? lastSyncPlaybackRef.current.isPlaying
                    : lastSyncPlaybackRef.current.status === 'playing';

                  isProgrammaticUpdate.current = true;
                  if (shouldBePlaying && state !== window.YT.PlayerState.PLAYING) {
                    event.target.playVideo();
                  } else if (!shouldBePlaying && state !== window.YT.PlayerState.PAUSED) {
                    event.target.pauseVideo();
                    event.target.seekTo(targetTime, true);
                  }
                }
              }
            },
            onError: (event) => {
              if (isCancelled) return;
              console.error('YouTube Player Error code:', event.data);
              let errorMsg = 'An error occurred loading this video.';
              if (event.data === 2) errorMsg = 'Invalid YouTube video ID or URL format.';
              if (event.data === 5) errorMsg = 'HTML5 player error. The video cannot be played in this browser.';
              if (event.data === 100) errorMsg = 'The requested video was not found or is private.';
              if (event.data === 101 || event.data === 150) {
                errorMsg = 'Embedding this video is restricted by its owner. Please try another video.';
              }
              setPlayerError(errorMsg);
              setIsReady(true);
            },
          },
        });
      } catch (err) {
        if (isCancelled) return;
        console.error('Failed to initialize YouTube Player constructor:', err);
        setPlayerError(err?.message || 'Could not initialize video player.');
        setIsReady(true);
      }
    }

    init();

    return () => {
      isCancelled = true;
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying player:', e);
        }
        playerRef.current = null;
      }
      const host = document.getElementById(containerId);
      if (host) {
        host.innerHTML = '';
      }
      setIsReady(false);
    };
  }, [containerId, enabled, applySyncToPlayer]);

  // Periodic ticker for:
  // 1. Updating currentTime
  // 2. Detecting Host native YouTube seek bar scrubbing
  // 3. Continuous participant drift alignment
  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function') return;

      const curr = player.getCurrentTime();
      const state = player.getPlayerState ? player.getPlayerState() : -1;
      const isPlaying = state === (window.YT?.PlayerState?.PLAYING || 1);

      setCurrentTime(curr);

      const now = Date.now();
      const dt = Math.max(0.01, (now - lastTickTime.current) / 1000);
      lastTickTime.current = now;

      // If programmatically updated, accept new position without broadcasting
      if (isProgrammaticUpdate.current) {
        isProgrammaticUpdate.current = false;
        lastObservedTime.current = curr;
        return;
      }

      // If Host: detect native YouTube seek bar scrubbing
      if (canControlRef.current) {
        const expectedTime = lastObservedTime.current + (isPlaying ? dt : 0);
        const jump = Math.abs(curr - expectedTime);

        // If time jumped forward/backward by more than 1.2s (or >0.4s while paused)
        const threshold = isPlaying ? 1.2 : 0.4;
        if (jump > threshold) {
          onUserSeekRef.current?.(curr);
        }
      } else {
        // If Participant: maintain continuous alignment with host state
        if (lastSyncPlaybackRef.current) {
          const authTime = computeAuthoritativeTime(lastSyncPlaybackRef.current);
          const drift = Math.abs(curr - authTime);
          if (drift > 1.5) {
            isProgrammaticUpdate.current = true;
            try {
              player.seekTo(authTime, true);
            } catch (e) {
              // ignore
            }
          }
        }
      }

      lastObservedTime.current = curr;
    }, 250);

    return () => clearInterval(interval);
  }, [isReady]);

  // Sync state apply method called by WatchRoom when sync_state arrives
  const syncWithServer = useCallback(
    (playback) => {
      applySyncToPlayer(playback);
    },
    [applySyncToPlayer]
  );

  // Manual Seek
  const seekTo = useCallback((seconds) => {
    const player = playerRef.current;
    if (!player || typeof player.seekTo !== 'function') return;
    isProgrammaticUpdate.current = true;
    try {
      player.seekTo(seconds, true);
      setCurrentTime(seconds);
      lastObservedTime.current = seconds;
    } catch (e) {
      console.warn('Error in manual seek:', e);
    }
  }, []);

  // Manual Play
  const playVideo = useCallback(() => {
    const player = playerRef.current;
    if (!player || typeof player.playVideo !== 'function') return;
    isProgrammaticUpdate.current = true;
    try {
      player.playVideo();
    } catch (e) {
      console.warn('Error in manual play:', e);
    }
  }, []);

  // Manual Pause
  const pauseVideo = useCallback(() => {
    const player = playerRef.current;
    if (!player || typeof player.pauseVideo !== 'function') return;
    isProgrammaticUpdate.current = true;
    try {
      player.pauseVideo();
    } catch (e) {
      console.warn('Error in manual pause:', e);
    }
  }, []);

  // Mute / Unmute
  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (player.isMuted()) {
        player.unMute();
        setIsMuted(false);
        setAutoplayBlocked(false);
      } else {
        player.mute();
        setIsMuted(true);
      }
    } catch (e) {
      console.warn('Error in toggleMute:', e);
    }
  }, []);

  return {
    player: playerRef.current,
    isReady,
    playerState,
    currentTime,
    duration,
    isMuted,
    playerError,
    autoplayBlocked,
    syncWithServer,
    seekTo,
    playVideo,
    pauseVideo,
    toggleMute,
    setPlayerError,
  };
}
