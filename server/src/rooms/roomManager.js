const { generateRoomId, generateUniqueId } = require('../utils/idGenerator');
const { extractYouTubeVideoId } = require('../utils/youtube');
const config = require('../config');

// Role constants
const ROLES = {
  HOST: 'host',
  MODERATOR: 'moderator',
  PARTICIPANT: 'participant',
};

// Playback statuses
const PLAYBACK_STATUS = {
  PLAYING: 'playing',
  PAUSED: 'paused',
  BUFFERING: 'buffering',
  ENDED: 'ended',
};

class RoomManager {
  constructor() {
    /**
     * Map of roomId -> Room
     */
    this.rooms = new Map();

    /**
     * Map of socketId -> { roomId, participantId }
     * Enables secure lookup and spoof-prevention
     */
    this.socketMap = new Map();

    /**
     * Grace period timers for empty rooms & disconnecting participants
     */
    this.roomCleanupTimers = new Map();
    this.disconnectTimers = new Map();
  }

  /**
   * Helper to check permissions
   */
  canControlPlayback(role) {
    return role === ROLES.HOST || role === ROLES.MODERATOR;
  }

  canManageRoles(role) {
    return role === ROLES.HOST;
  }

  canRemoveParticipant(role) {
    return role === ROLES.HOST;
  }

  canResolveRequests(role) {
    return role === ROLES.HOST || role === ROLES.MODERATOR;
  }

  canSendChat(role) {
    return [ROLES.HOST, ROLES.MODERATOR, ROLES.PARTICIPANT].includes(role);
  }

  /**
   * Calculate authoritative current playback time
   */
  getAuthoritativePlaybackTime(room) {
    if (!room || !room.playback) return 0;
    const { status, currentTime, lastUpdated, updatedAt, playbackRate = 1 } = room.playback;
    const updateTime = lastUpdated || updatedAt || Date.now();
    if (status === PLAYBACK_STATUS.PLAYING) {
      const elapsedSeconds = ((Date.now() - updateTime) / 1000) * playbackRate;
      return Math.max(0, currentTime + elapsedSeconds);
    }
    return Math.max(0, currentTime);
  }

  /**
   * Format room state for client synchronization
   */
  getSyncState(room) {
    const isPlaying = room.playback.status === PLAYBACK_STATUS.PLAYING;
    const authoritativeTime = this.getAuthoritativePlaybackTime(room);
    const now = Date.now();
    const updateTime = room.playback.updatedAt || room.playback.lastUpdated || now;

    return {
      roomId: room.roomId,
      hostId: room.hostId,
      playback: {
        videoId: room.playback.videoId,
        status: room.playback.status,
        isPlaying,
        currentTime: authoritativeTime,
        rawCurrentTime: room.playback.currentTime,
        updatedAt: updateTime,
        lastUpdated: updateTime,
        serverTimestamp: now,
        playbackRate: room.playback.playbackRate || 1,
        hostId: room.hostId,
      },
      participants: Array.from(room.participants.values()).map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        isOnline: p.isOnline,
        joinedAt: p.joinedAt,
      })),
      pendingRequests: room.requests.filter(r => r.status === 'pending'),
      resolvedRequests: room.requests.filter(r => r.status !== 'pending').slice(-10),
    };
  }

  /**
   * Create a new room with Host
   */
  createRoom(hostName = 'Host', socketId = null, initialVideoId = null) {
    let roomId = generateRoomId().toLowerCase();
    while (this.rooms.has(roomId)) {
      roomId = generateRoomId().toLowerCase();
    }

    const hostId = generateUniqueId('user');
    const safeName = (hostName && hostName.trim()) ? hostName.trim().slice(0, 30) : 'Host';
    let videoId = config.defaultVideoId;
    if (initialVideoId && typeof initialVideoId === 'string') {
      const val = extractYouTubeVideoId(initialVideoId);
      if (val.valid && val.videoId) {
        videoId = val.videoId;
      }
    }

    const hostParticipant = {
      id: hostId,
      socketId,
      name: safeName,
      role: ROLES.HOST,
      isOnline: true,
      joinedAt: Date.now(),
    };

    const room = {
      roomId,
      hostId,
      createdAt: Date.now(),
      participants: new Map([[hostId, hostParticipant]]),
      playback: {
        videoId,
        status: PLAYBACK_STATUS.PAUSED,
        isPlaying: false,
        currentTime: 0,
        updatedAt: Date.now(),
        lastUpdated: Date.now(),
        playbackRate: 1,
      },
      requests: [],
      chatMessages: [],
    };

    this.rooms.set(roomId, room);
    if (socketId) {
      this.socketMap.set(socketId, { roomId, participantId: hostId });
    }

    return { room, host: hostParticipant };
  }

  /**
   * Join an existing room
   */
  joinRoom(roomId, participantName = 'Guest', socketId = null, reconnectParticipantId = null) {
    const cleanId = String(roomId || '').trim().toLowerCase();
    const room = this.rooms.get(cleanId);
    if (!room) {
      return { success: false, error: 'Room not found. Please verify the room code.' };
    }

    // Cancel empty-room cleanup timer if active
    if (this.roomCleanupTimers.has(cleanId)) {
      clearTimeout(this.roomCleanupTimers.get(cleanId));
      this.roomCleanupTimers.delete(cleanId);
    }

    // If socket was already registered, handle appropriately
    if (socketId && this.socketMap.has(socketId)) {
      const existingMapping = this.socketMap.get(socketId);
      if (existingMapping.roomId !== cleanId) {
        // Socket was in a DIFFERENT room, leave old room first
        this.leaveRoom(socketId);
      } else {
        // Socket is ALREADY registered in this room!
        const existingParticipant = room.participants.get(existingMapping.participantId);
        if (existingParticipant) {
          existingParticipant.isOnline = true;
          return { success: true, room, participant: existingParticipant, isReconnection: true };
        }
      }
    }

    // Check for reconnection of existing participant in this room
    if (reconnectParticipantId && room.participants.has(reconnectParticipantId)) {
      const existing = room.participants.get(reconnectParticipantId);

      // Cancel disconnect timer for this participant if pending
      if (this.disconnectTimers.has(existing.id)) {
        clearTimeout(this.disconnectTimers.get(existing.id));
        this.disconnectTimers.delete(existing.id);
      }

      if (existing.socketId && existing.socketId !== socketId) {
        this.socketMap.delete(existing.socketId);
      }
      existing.socketId = socketId;
      existing.isOnline = true;
      if (room.hostId === existing.id) {
        existing.role = ROLES.HOST;
      }
      if (socketId) {
        this.socketMap.set(socketId, { roomId: cleanId, participantId: existing.id });
      }
      return { success: true, room, participant: existing, isReconnection: true };
    }

    const safeName = (participantName && participantName.trim()) 
      ? participantName.trim().slice(0, 30) 
      : `Guest ${room.participants.size + 1}`;

    const participantId = generateUniqueId('user');
    // If the room currently has no participants, assign this user as Host
    const isFirstParticipant = room.participants.size === 0;
    const role = isFirstParticipant ? ROLES.HOST : ROLES.PARTICIPANT;
    if (isFirstParticipant) {
      room.hostId = participantId;
    }

    const participant = {
      id: participantId,
      socketId,
      name: safeName,
      role,
      isOnline: true,
      joinedAt: Date.now(),
    };

    room.participants.set(participantId, participant);
    if (socketId) {
      this.socketMap.set(socketId, { roomId: cleanId, participantId });
    }

    return { success: true, room, participant, isReconnection: false };
  }

  /**
   * Get room by ID
   */
  getRoom(roomId) {
    if (!roomId) return null;
    return this.rooms.get(String(roomId).trim().toLowerCase());
  }

  /**
   * Get participant and room info by socket ID
   */
  getParticipantBySocket(socketId) {
    const mapping = this.socketMap.get(socketId);
    if (!mapping) return null;
    const room = this.rooms.get(mapping.roomId);
    if (!room) return null;
    const participant = room.participants.get(mapping.participantId);
    if (!participant) return null;
    return { room, participant };
  }

  /**
   * Handle socket disconnection without instantly purging participant
   * (allows page refreshes, tab reloads, and temporary network drops)
   */
  handleDisconnect(socketId) {
    const mapping = this.socketMap.get(socketId);
    if (!mapping) return null;

    const { roomId, participantId } = mapping;
    this.socketMap.delete(socketId);

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const participant = room.participants.get(participantId);
    if (!participant) return null;

    participant.isOnline = false;
    participant.socketId = null;

    // Check if any participants remain online
    const hasOnline = Array.from(room.participants.values()).some((p) => p.isOnline);
    if (!hasOnline && !this.roomCleanupTimers.has(roomId)) {
      const timer = setTimeout(() => {
        this.rooms.delete(roomId);
        this.roomCleanupTimers.delete(roomId);
      }, 5 * 60 * 1000); // 5 minute grace period for empty room
      this.roomCleanupTimers.set(roomId, timer);
    }

    // Schedule delayed participant removal if they do not reconnect within 3 minutes
    if (!this.disconnectTimers.has(participantId)) {
      const timer = setTimeout(() => {
        this.disconnectTimers.delete(participantId);
        if (room.participants.has(participantId) && !room.participants.get(participantId).isOnline) {
          room.participants.delete(participantId);
          if (room.hostId === participantId && room.participants.size > 0) {
            const participantsArray = Array.from(room.participants.values());
            const nextHost = participantsArray.find((p) => p.role === ROLES.MODERATOR) || participantsArray[0];
            if (nextHost) {
              nextHost.role = ROLES.HOST;
              room.hostId = nextHost.id;
            }
          }
          if (room.participants.size === 0) {
            this.rooms.delete(roomId);
          }
        }
      }, 3 * 60 * 1000);
      this.disconnectTimers.set(participantId, timer);
    }

    return { room, participant };
  }

  /**
   * Handle user disconnection or leaving
   */
  leaveRoom(socketId) {
    const mapping = this.socketMap.get(socketId);
    if (!mapping) return null;

    const { roomId, participantId } = mapping;
    this.socketMap.delete(socketId);

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const participant = room.participants.get(participantId);
    if (!participant) return null;

    // Remove participant from room
    room.participants.delete(participantId);

    let newHostAssigned = false;
    let newHost = null;

    // If the leaving user was the host, transfer host to next in line
    if (room.hostId === participantId && room.participants.size > 0) {
      // Prefer moderator if exists, otherwise first participant
      const participantsArray = Array.from(room.participants.values());
      const nextHost = participantsArray.find(p => p.role === ROLES.MODERATOR) || participantsArray[0];
      
      if (nextHost) {
        nextHost.role = ROLES.HOST;
        room.hostId = nextHost.id;
        newHostAssigned = true;
        newHost = nextHost;
      }
    }

    // Clean up empty room with grace period
    if (room.participants.size === 0) {
      if (!this.roomCleanupTimers.has(roomId)) {
        const timer = setTimeout(() => {
          this.rooms.delete(roomId);
          this.roomCleanupTimers.delete(roomId);
        }, 5 * 60 * 1000);
        this.roomCleanupTimers.set(roomId, timer);
      }
      return { roomDeleted: true, roomId, participant };
    }

    return {
      roomDeleted: false,
      room,
      participant,
      newHostAssigned,
      newHost,
    };
  }

  /**
   * Direct playback control (play, pause, seek, change_video)
   */
  updatePlayback(roomId, action, payload, socketId) {
    const info = this.getParticipantBySocket(socketId);
    if (!info) {
      return { success: false, error: 'User is not in a room' };
    }

    const { room, participant } = info;
    if (room.roomId !== roomId) {
      return { success: false, error: 'Unauthorized: room mismatch' };
    }

    // Role check: must be Host or Moderator
    if (!this.canControlPlayback(participant.role)) {
      return {
        success: false,
        error: 'Permission denied: Only Host or Moderator can directly control playback. Please submit a request.',
        requiresApproval: true,
      };
    }

    return this.applyPlaybackAction(room, action, payload, participant);
  }

  /**
   * Internal execution of playback action
   */
  applyPlaybackAction(room, action, payload = {}, executor = null) {
    const now = Date.now();

    switch (action) {
      case 'play': {
        const targetTime = typeof payload.currentTime === 'number' 
          ? Math.max(0, payload.currentTime) 
          : this.getAuthoritativePlaybackTime(room);

        room.playback.status = PLAYBACK_STATUS.PLAYING;
        room.playback.isPlaying = true;
        room.playback.currentTime = targetTime;
        room.playback.updatedAt = now;
        room.playback.lastUpdated = now;
        break;
      }

      case 'pause': {
        const targetTime = typeof payload.currentTime === 'number'
          ? Math.max(0, payload.currentTime)
          : this.getAuthoritativePlaybackTime(room);

        room.playback.status = PLAYBACK_STATUS.PAUSED;
        room.playback.isPlaying = false;
        room.playback.currentTime = targetTime;
        room.playback.updatedAt = now;
        room.playback.lastUpdated = now;
        break;
      }

      case 'seek': {
        if (typeof payload.currentTime !== 'number' || payload.currentTime < 0) {
          return { success: false, error: 'Invalid seek position' };
        }
        room.playback.currentTime = payload.currentTime;
        room.playback.updatedAt = now;
        room.playback.lastUpdated = now;
        room.playback.isPlaying = room.playback.status === PLAYBACK_STATUS.PLAYING;
        break;
      }

      case 'change_video': {
        const { url, videoId: rawVideoId } = payload;
        const validation = extractYouTubeVideoId(url || rawVideoId);
        if (!validation.valid) {
          return { success: false, error: validation.error || 'Invalid YouTube video ID or URL' };
        }

        room.playback.videoId = validation.videoId;
        room.playback.currentTime = 0;
        room.playback.status = PLAYBACK_STATUS.PLAYING; // start auto-playing new video
        room.playback.isPlaying = true;
        room.playback.updatedAt = now;
        room.playback.lastUpdated = now;
        break;
      }

      default:
        return { success: false, error: `Unsupported playback action: ${action}` };
    }

    return {
      success: true,
      room,
      action,
      payload,
      executor: executor ? { id: executor.id, name: executor.name, role: executor.role } : null,
    };
  }

  /**
   * Participant submits an approval request
   */
  requestAction(roomId, action, payload, socketId) {
    const info = this.getParticipantBySocket(socketId);
    if (!info) {
      return { success: false, error: 'User is not in a room' };
    }

    const { room, participant } = info;
    if (room.roomId !== roomId) {
      return { success: false, error: 'Room mismatch' };
    }

    // Validate action
    const allowedActions = ['play', 'pause', 'seek', 'change_video'];
    if (!allowedActions.includes(action)) {
      return { success: false, error: `Invalid action request: ${action}` };
    }

    // If change_video, pre-validate video URL
    if (action === 'change_video') {
      const validation = extractYouTubeVideoId(payload?.url || payload?.videoId);
      if (!validation.valid) {
        return { success: false, error: validation.error || 'Invalid YouTube URL for video request' };
      }
      payload.videoId = validation.videoId;
    }

    // If seek, pre-validate time
    if (action === 'seek') {
      if (typeof payload?.currentTime !== 'number' || payload.currentTime < 0) {
        return { success: false, error: 'Invalid seek time provided' };
      }
    }

    // Prevent spam: check pending requests from this participant
    const existingPending = room.requests.filter(
      r => r.requesterId === participant.id && r.status === 'pending'
    );
    if (existingPending.length >= 5) {
      return { success: false, error: 'You have too many pending requests. Please wait for the host to review.' };
    }

    const request = {
      id: generateUniqueId('req'),
      requesterId: participant.id,
      requesterName: participant.name,
      action,
      payload,
      createdAt: Date.now(),
      status: 'pending',
    };

    room.requests.push(request);

    return {
      success: true,
      room,
      request,
    };
  }

  /**
   * Host or Moderator approves or rejects a request
   */
  resolveRequest(roomId, requestId, approved, socketId) {
    const info = this.getParticipantBySocket(socketId);
    if (!info) {
      return { success: false, error: 'User is not in a room' };
    }

    const { room, participant } = info;
    if (room.roomId !== roomId) {
      return { success: false, error: 'Room mismatch' };
    }

    // Authorization: only Host or Moderator can resolve requests
    if (!this.canResolveRequests(participant.role)) {
      return { success: false, error: 'Unauthorized: Only Host or Moderator can approve/reject requests.' };
    }

    const request = room.requests.find(r => r.id === requestId);
    if (!request) {
      return { success: false, error: 'Request not found.' };
    }

    if (request.status !== 'pending') {
      return { success: false, error: `Request has already been ${request.status}.` };
    }

    request.resolvedAt = Date.now();
    request.resolvedBy = {
      id: participant.id,
      name: participant.name,
      role: participant.role,
    };

    if (approved) {
      request.status = 'approved';
      // Execute the requested action!
      const executionResult = this.applyPlaybackAction(
        room,
        request.action,
        request.payload,
        { id: request.requesterId, name: request.requesterName, role: 'participant' }
      );

      return {
        success: true,
        room,
        request,
        executed: true,
        executionResult,
      };
    } else {
      request.status = 'rejected';
      return {
        success: true,
        room,
        request,
        executed: false,
      };
    }
  }

  /**
   * Host assigns role to another participant
   */
  assignRole(roomId, targetParticipantId, newRole, socketId) {
    const info = this.getParticipantBySocket(socketId);
    if (!info) {
      return { success: false, error: 'User is not in a room' };
    }

    const { room, participant } = info;
    if (room.roomId !== roomId) {
      return { success: false, error: 'Room mismatch' };
    }

    // Only Host can change roles
    if (!this.canManageRoles(participant.role)) {
      return { success: false, error: 'Unauthorized: Only the Host can assign roles.' };
    }

    // Prevent changing role of non-existent user
    const target = room.participants.get(targetParticipantId);
    if (!target) {
      return { success: false, error: 'Participant not found in room.' };
    }

    // Prevent self-demotion via assignRole unless transferring host
    if (target.id === participant.id && newRole !== ROLES.HOST) {
      return { success: false, error: 'Host cannot demote themselves directly. Use host transfer instead.' };
    }

    if (![ROLES.HOST, ROLES.MODERATOR, ROLES.PARTICIPANT].includes(newRole)) {
      return { success: false, error: 'Invalid role specified.' };
    }

    if (newRole === ROLES.HOST) {
      // Transfer Host: Old host becomes Moderator
      participant.role = ROLES.MODERATOR;
      target.role = ROLES.HOST;
      room.hostId = target.id;
    } else {
      target.role = newRole;
    }

    return {
      success: true,
      room,
      targetParticipant: {
        id: target.id,
        name: target.name,
        role: target.role,
      },
      assignedBy: participant.name,
    };
  }

  /**
   * Host removes a participant
   */
  removeParticipant(roomId, targetParticipantId, socketId) {
    const info = this.getParticipantBySocket(socketId);
    if (!info) {
      return { success: false, error: 'User is not in a room' };
    }

    const { room, participant } = info;
    if (room.roomId !== roomId) {
      return { success: false, error: 'Room mismatch' };
    }

    // Only Host can remove participants
    if (!this.canRemoveParticipant(participant.role)) {
      return { success: false, error: 'Unauthorized: Only the Host can remove participants.' };
    }

    const target = room.participants.get(targetParticipantId);
    if (!target) {
      return { success: false, error: 'Participant not found.' };
    }

    if (target.id === participant.id) {
      return { success: false, error: 'Cannot remove yourself as Host. Leave the room instead.' };
    }

    // Remove mapping and participant
    if (target.socketId) {
      this.socketMap.delete(target.socketId);
    }
    room.participants.delete(targetParticipantId);

    return {
      success: true,
      room,
      removedParticipant: {
        id: target.id,
        name: target.name,
        socketId: target.socketId,
      },
    };
  }

  /**
   * Add a chat message
   */
  addChatMessage(roomId, text, socketId) {
    const info = this.getParticipantBySocket(socketId);
    if (!info) {
      return { success: false, error: 'User is not in a room' };
    }

    const { room, participant } = info;
    const cleanRoomId = String(roomId || '').trim().toLowerCase();
    if (room.roomId !== cleanRoomId) {
      return { success: false, error: 'Room mismatch' };
    }

    if (!participant || !participant.id) {
      return { success: false, error: 'Participant not recognized' };
    }

    // Role check: Host, Moderator, and Participant are all allowed to chat
    if (!this.canSendChat(participant.role)) {
      return { success: false, error: 'Unauthorized: Chat is disabled for this user' };
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
      return { success: false, error: 'Message cannot be empty' };
    }

    const safeText = text.trim().slice(0, 500); // limit 500 chars

    const message = {
      id: generateUniqueId('msg'),
      senderId: participant.id,
      senderName: participant.name,
      senderRole: participant.role,
      text: safeText,
      timestamp: Date.now(),
    };

    room.chatMessages.push(message);
    if (room.chatMessages.length > 200) {
      room.chatMessages.shift(); // keep last 200 messages in memory
    }

    return {
      success: true,
      room,
      message,
    };
  }
}

module.exports = {
  RoomManager,
  ROLES,
  PLAYBACK_STATUS,
};
