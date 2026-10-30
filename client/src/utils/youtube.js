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

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v');
      } else if (url.pathname.startsWith('/shorts/')) {
        const parts = url.pathname.split('/');
        videoId = parts[2];
      } else if (url.pathname.startsWith('/embed/')) {
        const parts = url.pathname.split('/');
        videoId = parts[2];
      } else if (url.pathname.startsWith('/v/')) {
        const parts = url.pathname.split('/');
        videoId = parts[2];
      }
    } else if (host === 'youtu.be') {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        videoId = parts[0];
      }
    }

    if (videoId && YOUTUBE_ID_REGEX.test(videoId)) {
      return { valid: true, videoId };
    }

    return { valid: false, error: 'Please enter a valid YouTube watch, shorts, or youtu.be link.' };
  } catch (err) {
    return { valid: false, error: 'Could not parse URL. Please check the link.' };
  }
}

export function getYouTubeThumbnail(videoId) {
  if (!videoId) return '';
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
