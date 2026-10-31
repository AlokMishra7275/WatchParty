import { io } from 'socket.io-client';
import { SERVER_URL } from './api';

class SocketService {
  constructor() {
    this.socket = null;
    this.serverUrl = SERVER_URL;
  }

  connect() {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    return this.socket;
  }

  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // --- Client-to-server action methods with Promise wrappers ---

  joinRoom({ roomId, name, isCreating = false, initialVideoId = null, participantId = null }, timeoutMs = 10000) {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({ success: false, error: 'Connection timed out. Please check your connection and try again.' });
        }
      }, timeoutMs);

      if (!socket.connected) {
        socket.connect();
      }

      socket.emit('join_room', { roomId, name, isCreating, initialVideoId, participantId }, (response) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(response || { success: false, error: 'No response from server.' });
        }
      });
    });
  }

  leaveRoom(roomId) {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('leave_room', { roomId }, (response) => {
        resolve(response);
      });
    });
  }

  play(currentTime) {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('play', { currentTime }, (response) => {
        resolve(response);
      });
    });
  }

  pause(currentTime) {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('pause', { currentTime }, (response) => {
        resolve(response);
      });
    });
  }

  seek(currentTime) {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('seek', { currentTime }, (response) => {
        resolve(response);
      });
    });
  }

  changeVideo(url, videoId) {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('change_video', { url, videoId }, (response) => {
        resolve(response);
      });
    });
  }

  requestAction(action, payload) {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('request_action', { action, payload }, (response) => {
        resolve(response);
      });
    });
  }

  approveRequest(requestId) {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('approve_request', { requestId }, (response) => {
        resolve(response);
      });
    });
  }

  rejectRequest(requestId) {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('reject_request', { requestId }, (response) => {
        resolve(response);
      });
    });
  }

  assignRole(targetParticipantId, newRole) {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('assign_role', { targetParticipantId, newRole }, (response) => {
        resolve(response);
      });
    });
  }

  removeParticipant(targetParticipantId) {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('remove_participant', { targetParticipantId }, (response) => {
        resolve(response);
      });
    });
  }

  sendChat(text, roomId = null) {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      if (!socket.connected) {
        resolve({ success: false, error: 'Socket is disconnected. Please wait for reconnection.' });
        return;
      }
      socket.emit('send_chat', { text, roomId }, (response) => {
        resolve(response || { success: false, error: 'No response from server.' });
      });
    });
  }
}

export const socketService = new SocketService();
