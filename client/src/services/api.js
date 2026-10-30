/**
 * API client for WatchParty REST endpoints
 */

const rawEnv = (import.meta.env.VITE_SERVER_URL || '').trim();
const SERVER_URL = rawEnv.replace(/\/+$/, '');

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
    const res = await fetch(`${SERVER_URL}/api/rooms/${encodeURIComponent(roomId)}/validate`);
    const data = await res.json();
    return { ok: res.ok, status: res.status, ...data };
  } catch (err) {
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
  } catch (err) {
    return { valid: false, error: 'Failed to validate URL' };
  }
}
