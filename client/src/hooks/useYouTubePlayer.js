import { useEffect, useRef, useState, useCallback } from 'react';
import { extractYouTubeVideoId } from '../utils/youtube';

let ytApiPromise = null;

/**
 * Robust YouTube IFrame API script loader.
 * Reuses single promise across callers and handles timeouts/errors cleanly.
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
 * YouTube IFrame API Hook
 * Manages player lifecycle, prevents synchronization feedback loops,
 * and handles drift correction.
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

  // Flags to prevent echo loops
  const isProgrammaticUpdate = useRef(false);
  const lastReportedTime = useRef(0);
  const currentVideoIdRef = useRef(sanitizeVideoId(initialVideoId));

  useEffect(() => {
    if (initialVideoId) {
      currentVideoIdRef.current = sanitizeVideoId(initialVideoId);
    }
  }, [initialVideoId]);

  // Keep fresh references to callbacks & permissions to avoid stale closures in player events
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

      // Locate host container in DOM (retry if layout is mounting)
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

      // Clear the host container so no stale iframes or orphaned elements exist
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
            controls: 1,
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
            },
            onStateChange: (event) => {
              if (isCancelled) return;
              const state = event.data;
              setPlayerState(state);

              if (event.target.getDuration) {
                setDuration(event.target.getDuration());
              }

              if (isProgrammaticUpdate.current) {
                isProgrammaticUpdate.current = false;
                return;
              }

              if (canControlRef.current) {
                const nowTime = event.target.getCurrentTime ? event.target.getCurrentTime() : 0;
                if (state === window.YT.PlayerState.PLAYING) {
                  onUserPlayRef.current?.(nowTime);
                } else if (state === window.YT.PlayerState.PAUSED) {
                  onUserPauseRef.current?.(nowTime);
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
  }, [containerId, enabled]);

  // Periodic time tracker
  useEffect(() => {
    if (!isReady) return;
    const interval = setInterval(() => {
      if (playerRef.current && isReady && typeof playerRef.current.getCurrentTime === 'function') {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
        lastReportedTime.current = time;
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isReady]);

  // Sync state apply method
  const syncWithServer = useCallback(
    ({ videoId, status, targetTime }) => {
      const player = playerRef.current;
      if (!player || !isReady) return;

      const cleanTargetVideoId = sanitizeVideoId(videoId);

      // 1. Video ID check
      if (cleanTargetVideoId && cleanTargetVideoId !== currentVideoIdRef.current) {
        currentVideoIdRef.current = cleanTargetVideoId;
        isProgrammaticUpdate.current = true;
        setPlayerError(null);
        try {
          if (status === 'playing') {
            player.loadVideoById({ videoId: cleanTargetVideoId, startSeconds: targetTime || 0 });
          } else {
            player.cueVideoById({ videoId: cleanTargetVideoId, startSeconds: targetTime || 0 });
          }
        } catch (e) {
          console.warn('Error loading video by ID:', e);
        }
        return;
      }

      // 2. Play / Pause status check
      const currentYTState = player.getPlayerState ? player.getPlayerState() : -1;
      const isCurrentlyPlaying = currentYTState === (window.YT?.PlayerState?.PLAYING || 1);

      if (status === 'playing' && !isCurrentlyPlaying) {
        isProgrammaticUpdate.current = true;
        try {
          player.playVideo();
        } catch (e) {
          console.warn('Error playing video:', e);
        }
      } else if (status === 'paused' && isCurrentlyPlaying) {
        isProgrammaticUpdate.current = true;
        try {
          player.pauseVideo();
        } catch (e) {
          console.warn('Error pausing video:', e);
        }
      }

      // 3. Drift check (seek if difference > 1.5 seconds)
      const localTime = player.getCurrentTime ? player.getCurrentTime() : 0;
      const drift = Math.abs(localTime - targetTime);

      if (drift > 1.5) {
        isProgrammaticUpdate.current = true;
        try {
          player.seekTo(targetTime, true);
        } catch (e) {
          console.warn('Error seeking video:', e);
        }
      }
    },
    [isReady]
  );

  // Manual Seek
  const seekTo = useCallback((seconds) => {
    const player = playerRef.current;
    if (!player || typeof player.seekTo !== 'function') return;
    isProgrammaticUpdate.current = true;
    try {
      player.seekTo(seconds, true);
      setCurrentTime(seconds);
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
