import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * YouTube IFrame API Hook
 * Manages player lifecycle, prevents synchronization feedback loops,
 * and handles drift correction.
 */
export function useYouTubePlayer({
  containerId,
  initialVideoId,
  canControl,
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
  const currentVideoIdRef = useRef(initialVideoId);

  // 1. Load YouTube IFrame Script
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevOnReady) prevOnReady();
      initPlayer();
    };

    function initPlayer() {
      if (!document.getElementById(containerId)) return;
      if (playerRef.current) return;

      try {
        playerRef.current = new window.YT.Player(containerId, {
          height: '100%',
          width: '100%',
          videoId: currentVideoIdRef.current || 'dQw4w9WgXcQ',
          playerVars: {
            autoplay: 1,
            controls: 1, // allow native controls as well as custom
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              setIsReady(true);
              setDuration(event.target.getDuration() || 0);
              // Test autoplay
              const state = event.target.getPlayerState();
              if (state !== window.YT.PlayerState.PLAYING) {
                // If it didn't play automatically, might be browser autoplay policy
              }
            },
            onStateChange: (event) => {
              const state = event.data;
              setPlayerState(state);

              // Update duration if not set
              if (event.target.getDuration) {
                setDuration(event.target.getDuration());
              }

              // Check if change was triggered programmatically by sync
              if (isProgrammaticUpdate.current) {
                // Programmatic change consumed, don't broadcast to server
                isProgrammaticUpdate.current = false;
                return;
              }

              // If triggered by authorized user interaction
              if (canControl) {
                const nowTime = event.target.getCurrentTime ? event.target.getCurrentTime() : 0;
                if (state === window.YT.PlayerState.PLAYING) {
                  onUserPlay?.(nowTime);
                } else if (state === window.YT.PlayerState.PAUSED) {
                  onUserPause?.(nowTime);
                }
              }
            },
            onError: (event) => {
              console.error('YouTube Player Error:', event.data);
              let errorMsg = 'An error occurred loading this video.';
              if (event.data === 2) errorMsg = 'Invalid video ID or URL.';
              if (event.data === 5) errorMsg = 'HTML5 player error.';
              if (event.data === 100) errorMsg = 'Video not found or removed.';
              if (event.data === 101 || event.data === 150) {
                errorMsg = 'Embedding this video is restricted by the owner. Please try another video.';
              }
              setPlayerError(errorMsg);
            },
          },
        });
      } catch (err) {
        console.error('Failed to initialize YouTube Player:', err);
      }
    }

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying player:', e);
        }
        playerRef.current = null;
      }
    };
  }, [containerId]);

  // Periodic time tracker
  useEffect(() => {
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

      // 1. Video ID check
      if (videoId && videoId !== currentVideoIdRef.current) {
        currentVideoIdRef.current = videoId;
        isProgrammaticUpdate.current = true;
        setPlayerError(null);
        try {
          if (status === 'playing') {
            player.loadVideoById({ videoId, startSeconds: targetTime || 0 });
          } else {
            player.cueVideoById({ videoId, startSeconds: targetTime || 0 });
          }
        } catch (e) {
          console.warn(e);
        }
        return;
      }

      // 2. Play / Pause status check
      const currentYTState = player.getPlayerState ? player.getPlayerState() : -1;
      const isCurrentlyPlaying = currentYTState === (window.YT?.PlayerState?.PLAYING || 1);

      if (status === 'playing' && !isCurrentlyPlaying) {
        isProgrammaticUpdate.current = true;
        player.playVideo();
      } else if (status === 'paused' && isCurrentlyPlaying) {
        isProgrammaticUpdate.current = true;
        player.pauseVideo();
      }

      // 3. Drift check (seek if difference > 1.5 seconds)
      const localTime = player.getCurrentTime ? player.getCurrentTime() : 0;
      const drift = Math.abs(localTime - targetTime);

      if (drift > 1.5) {
        isProgrammaticUpdate.current = true;
        player.seekTo(targetTime, true);
      }
    },
    [isReady]
  );

  // Manual Seek
  const seekTo = useCallback((seconds) => {
    const player = playerRef.current;
    if (!player || typeof player.seekTo !== 'function') return;
    isProgrammaticUpdate.current = true;
    player.seekTo(seconds, true);
    setCurrentTime(seconds);
  }, []);

  // Manual Play
  const playVideo = useCallback(() => {
    const player = playerRef.current;
    if (!player || typeof player.playVideo !== 'function') return;
    isProgrammaticUpdate.current = true;
    player.playVideo();
  }, []);

  // Manual Pause
  const pauseVideo = useCallback(() => {
    const player = playerRef.current;
    if (!player || typeof player.pauseVideo !== 'function') return;
    isProgrammaticUpdate.current = true;
    player.pauseVideo();
  }, []);

  // Mute / Unmute
  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.isMuted()) {
      player.unMute();
      setIsMuted(false);
      setAutoplayBlocked(false);
    } else {
      player.mute();
      setIsMuted(true);
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
