const crypto = require('crypto');

/**
 * Generate a friendly, collision-resistant room code.
 * Format: 3 lowercase letters + 4 digits (e.g., 'wp-4892' or 'pt-7210')
 */
function generateRoomId() {
  const letters = 'abcdefghjkmnpqrstuvwxyz'; // readable characters, omit confusing letters like l, o
  const prefix = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  const numbers = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${numbers}`;
}

/**
 * Generate a unique ID for users, requests, messages.
 */
function generateUniqueId(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

module.exports = {
  generateRoomId,
  generateUniqueId,
};
