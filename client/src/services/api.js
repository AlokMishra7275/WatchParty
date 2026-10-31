/**
 * API client for WatchParty REST endpoints
 */

export const DEFAULT_PRODUCTION_SERVER = 'https://watchparty-backend-zk7i.onrender.com';

const envUrl = (import.meta.env.VITE_SERVER_URL || '').trim().replace(/\/+$/, '');
export const SERVER_URL = envUrl || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : DEFAULT_PRODUCTION_SERVER
);

export async function checkServerHealth() {
  try {
    const res = await fetch(`${SERVER_URL}/api/health`);
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

export async function validateRoom(roomId) {
  try {
    const cleanId = encodeURIComponent(String(roomId || '').trim().toLowerCase());
    const res = await fetch(`${SERVER_URL}/api/rooms/${cleanId}/validate`);
    const data = await res.json();
    return { ok: res.ok, status: res.status, ...data };
  } catch (_err) {
    return { ok: false, valid: false, error: 'Could not reach server. Check your connection.' };
  }
}

export async function validateYouTubeUrl(url) {
  try {
    const res = await fetch(`${SERVER_URL}/api/youtube/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return await res.json();
  } catch (_err) {
    return { valid: false, error: 'Failed to validate URL' };
  }
}
