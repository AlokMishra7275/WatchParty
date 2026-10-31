/**
 * Formatting utilities for playback duration and chat timestamps
 */

export function formatDuration(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (num) => String(num).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${pad(minutes)}:${pad(secs)}`;
}

export function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatClockTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Clean & sanitize room codes from URLs, paths, query strings, and casing
 * e.g., 'https://app.vercel.app/room/wtch-1234/' -> 'wtch-1234'
 */
export function cleanRoomCode(input) {
  if (!input || typeof input !== 'string') return '';
  let str = input.trim();
  if (str.includes('/room/')) {
    str = str.split('/room/')[1];
  }
  return str.split('?')[0].split('#')[0].replace(/\/+$/, '').trim().toLowerCase();
}

/**
 * Reliable cross-browser clipboard copy with fallback
 */
export async function copyToClipboard(text) {
  if (!text) return false;

  // Try modern Clipboard API first
  try {
    if (navigator?.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.debug('navigator.clipboard failed, attempting fallback:', err);
  }

  // Fallback for older browsers or restricted iframe/webview permissions
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}
