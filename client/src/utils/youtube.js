/**
 * YouTube Utility functions for Frontend
 */

export const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeVideoId(input) {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Input URL or video ID is required' };
  }

  const trimmed = input.trim();

  // If already an 11-character ID
  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return { valid: true, videoId: trimmed };
  }

  try {
    let url;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      url = new URL(`https://${trimmed}`);
    } else {
      url = new URL(trimmed);
    }

    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let videoId = null;

    const isYouTubeHost = [
      'youtube.com',
      'm.youtube.com',
      'music.youtube.com',
      'gaming.youtube.com',
      'youtube-nocookie.com',
    ].includes(host);

    if (isYouTubeHost) {
      const segments = url.pathname.split('/').filter(Boolean);
      // 1. /watch?v=ID
      if (url.pathname === '/watch' || segments[0] === 'watch') {
        videoId = url.searchParams.get('v');
      }
      // 2. /shorts/ID, /embed/ID, /v/ID, /live/ID
      else if (segments.length >= 2 && ['shorts', 'embed', 'v', 'live'].includes(segments[0])) {
        videoId = segments[1];
      }
    } else if (host === 'youtu.be') {
      // 3. youtu.be/ID
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        videoId = parts[0];
      }
    }

    if (videoId && YOUTUBE_ID_REGEX.test(videoId)) {
      return { valid: true, videoId };
    }

    return { valid: false, error: 'Please enter a valid YouTube watch, shorts, embed, or youtu.be link.' };
  } catch (_err) {
    return { valid: false, error: 'Could not parse URL. Please check the link.' };
  }
}

export function getYouTubeThumbnail(videoId) {
  if (!videoId) return '';
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
