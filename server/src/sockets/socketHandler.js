/**
 * Socket.IO Handler for YouTube Watch Party
 * Enforces room isolation, role checks, and authoritative playback sync.
 */

function setupSocketHandlers(io, roomManager) {
  io.on('connection', (socket) => {
    // 1. JOIN ROOM
    socket.on('join_room', ({ roomId, name, isCreating = false, initialVideoId = null, participantId = null }, callback) => {
      try {
        let room;
        let participant;

        if (isCreating) {
          // Creating a new room
          const result = roomManager.createRoom(name, socket.id, initialVideoId);
          room = result.room;
          participant = result.host;
        } else {
          // Joining an existing room
          if (!roomId) {
            const err = 'Room code is required to join';
            if (typeof callback === 'function') callback({ success: false, error: err });
            socket.emit('error_message', { error: err });
            return;
          }

          const result = roomManager.joinRoom(roomId.trim(), name, socket.id, participantId);
          if (!result.success) {
            if (typeof callback === 'function') callback({ success: false, error: result.error });
            socket.emit('error_message', { error: result.error });
            return;
          }

          room = result.room;
          participant = result.participant;
        }

        // Join the Socket.IO room for scoped broadcasting
        socket.join(room.roomId);

        // Acknowledge join to the sender
        if (typeof callback === 'function') {
          callback({
            success: true,
            roomId: room.roomId,
            participant,
            syncState: roomManager.getSyncState(room),
            chatHistory: room.chatMessages.slice(-50),
          });
        }

        // Broadcast to everyone else in the room that a user joined
        socket.to(room.roomId).emit('user_joined', {
          participant,
          message: `${participant.name} joined the watch party.`,
          syncState: roomManager.getSyncState(room),
        });

        // Broadcast updated sync state to all room members
        io.to(room.roomId).emit('sync_state', roomManager.getSyncState(room));
      } catch (err) {
        console.error('Error in join_room:', err);
        socket.emit('error_message', { error: 'Failed to join room: ' + err.message });
      }
    });

    // 2. PLAY
    socket.on('play', ({ currentTime } = {}, callback) => {
      const info = roomManager.getParticipantBySocket(socket.id);
      if (!info) {
        const error = 'Not joined in any active room.';
        if (typeof callback === 'function') callback({ success: false, error });
        socket.emit('error_message', { error });
        return;
      }

      const { room } = info;
      const result = roomManager.updatePlayback(room.roomId, 'play', { currentTime }, socket.id);

      if (!result.success) {
        if (typeof callback === 'function') callback({ success: false, error: result.error, requiresApproval: result.requiresApproval });
        socket.emit('error_message', { error: result.error, requiresApproval: result.requiresApproval });
        return;
      }

      if (typeof callback === 'function') callback({ success: true });
      io.to(room.roomId).emit('sync_state', roomManager.getSyncState(room));
    });

    // 3. PAUSE
    socket.on('pause', ({ currentTime } = {}, callback) => {
      const info = roomManager.getParticipantBySocket(socket.id);
      if (!info) {
        const error = 'Not joined in any active room.';
        if (typeof callback === 'function') callback({ success: false, error });
        socket.emit('error_message', { error });
        return;
      }

      const { room } = info;
      const result = roomManager.updatePlayback(room.roomId, 'pause', { currentTime }, socket.id);

      if (!result.success) {
        if (typeof callback === 'function') callback({ success: false, error: result.error, requiresApproval: result.requiresApproval });
        socket.emit('error_message', { error: result.error, requiresApproval: result.requiresApproval });
        return;
      }

      if (typeof callback === 'function') callback({ success: true });
      io.to(room.roomId).emit('sync_state', roomManager.getSyncState(room));
    });

    // 4. SEEK
    socket.on('seek', ({ currentTime }, callback) => {
      const info = roomManager.getParticipantBySocket(socket.id);
      if (!info) {
        const error = 'Not joined in any active room.';
        if (typeof callback === 'function') callback({ success: false, error });
        socket.emit('error_message', { error });
        return;
      }

      const { room } = info;
      const result = roomManager.updatePlayback(room.roomId, 'seek', { currentTime }, socket.id);

      if (!result.success) {
        if (typeof callback === 'function') callback({ success: false, error: result.error, requiresApproval: result.requiresApproval });
        socket.emit('error_message', { error: result.error, requiresApproval: result.requiresApproval });
        return;
      }

      if (typeof callback === 'function') callback({ success: true });
      io.to(room.roomId).emit('sync_state', roomManager.getSyncState(room));
    });

    // 5. CHANGE VIDEO
    socket.on('change_video', ({ url, videoId }, callback) => {
      const info = roomManager.getParticipantBySocket(socket.id);
      if (!info) {
        const error = 'Not joined in any active room.';
        if (typeof callback === 'function') callback({ success: false, error });
        socket.emit('error_message', { error });
        return;
      }

      const { room } = info;
      const result = roomManager.updatePlayback(room.roomId, 'change_video', { url, videoId }, socket.id);

      if (!result.success) {
        if (typeof callback === 'function') callback({ success: false, error: result.error, requiresApproval: result.requiresApproval });
        socket.emit('error_message', { error: result.error, requiresApproval: result.requiresApproval });
        return;
      }

      if (typeof callback === 'function') callback({ success: true, videoId: room.playback.videoId });
      io.to(room.roomId).emit('sync_state', roomManager.getSyncState(room));
    });

    // 6. REQUEST ACTION (APPROVAL WORKFLOW)
    socket.on('request_action', ({ action, payload }, callback) => {
      const info = roomManager.getParticipantBySocket(socket.id);
      if (!info) {
        const error = 'Not joined in any active room.';
        if (typeof callback === 'function') callback({ success: false, error });
        socket.emit('error_message', { error });
        return;
      }

      const { room } = info;
      const result = roomManager.requestAction(room.roomId, action, payload, socket.id);

      if (!result.success) {
        if (typeof callback === 'function') callback({ success: false, error: result.error });
        socket.emit('error_message', { error: result.error });
        return;
      }

      if (typeof callback === 'function') callback({ success: true, request: result.request });

      // Notify the room of the new approval request
      io.to(room.roomId).emit('action_requested', {
        request: result.request,
        message: `${result.request.requesterName} requested to ${result.request.action.replace('_', ' ')}.`,
      });

      // Update room state with new pending request
      io.to(room.roomId).emit('sync_state', roomManager.getSyncState(room));
    });

    // 7. APPROVE REQUEST
    socket.on('approve_request', ({ requestId }, callback) => {
      const info = roomManager.getParticipantBySocket(socket.id);
      if (!info) {
        const error = 'Not joined in any active room.';
        if (typeof callback === 'function') callback({ success: false, error });
        socket.emit('error_message', { error });
        return;
      }

      const { room } = info;
      const result = roomManager.resolveRequest(room.roomId, requestId, true, socket.id);

      if (!result.success) {
        if (typeof callback === 'function') callback({ success: false, error: result.error });
        socket.emit('error_message', { error: result.error });
        return;
      }

      if (typeof callback === 'function') callback({ success: true, request: result.request });

      io.to(room.roomId).emit('request_resolved', {
        request: result.request,
        message: `Request by ${result.request.requesterName} was approved by ${result.request.resolvedBy.name}.`,
        executed: true,
      });

      // State changed, broadcast new playback state
      io.to(room.roomId).emit('sync_state', roomManager.getSyncState(room));
    });

    // 8. REJECT REQUEST
    socket.on('reject_request', ({ requestId }, callback) => {
      const info = roomManager.getParticipantBySocket(socket.id);
      if (!info) {
        const error = 'Not joined in any active room.';
        if (typeof callback === 'function') callback({ success: false, error });
        socket.emit('error_message', { error });
        return;
      }

      const { room } = info;
      const result = roomManager.resolveRequest(room.roomId, requestId, false, socket.id);

      if (!result.success) {
        if (typeof callback === 'function') callback({ success: false, error: result.error });
        socket.emit('error_message', { error: result.error });
        return;
      }

      if (typeof callback === 'function') callback({ success: true, request: result.request });

      io.to(room.roomId).emit('request_resolved', {
        request: result.request,
        message: `Request by ${result.request.requesterName} was rejected by ${result.request.resolvedBy.name}.`,
        executed: false,
      });

      io.to(room.roomId).emit('sync_state', roomManager.getSyncState(room));
    });

    // 9. ASSIGN ROLE
    socket.on('assign_role', ({ targetParticipantId, newRole }, callback) => {
      const info = roomManager.getParticipantBySocket(socket.id);
      if (!info) {
        const error = 'Not joined in any active room.';
        if (typeof callback === 'function') callback({ success: false, error });
        socket.emit('error_message', { error });
        return;
      }

      const { room } = info;
      const result = roomManager.assignRole(room.roomId, targetParticipantId, newRole, socket.id);

      if (!result.success) {
        if (typeof callback === 'function') callback({ success: false, error: result.error });
        socket.emit('error_message', { error: result.error });
        return;
      }

      if (typeof callback === 'function') callback({ success: true, targetParticipant: result.targetParticipant });

      io.to(room.roomId).emit('role_assigned', {
        targetParticipant: result.targetParticipant,
        assignedBy: result.assignedBy,
        message: `${result.targetParticipant.name} is now a ${result.targetParticipant.role}.`,
      });

      io.to(room.roomId).emit('sync_state', roomManager.getSyncState(room));
    });

    // 10. REMOVE PARTICIPANT
    socket.on('remove_participant', ({ targetParticipantId }, callback) => {
      const info = roomManager.getParticipantBySocket(socket.id);
      if (!info) {
        const error = 'Not joined in any active room.';
        if (typeof callback === 'function') callback({ success: false, error });
        socket.emit('error_message', { error });
        return;
      }

      const { room } = info;
      const result = roomManager.removeParticipant(room.roomId, targetParticipantId, socket.id);

      if (!result.success) {
        if (typeof callback === 'function') callback({ success: false, error: result.error });
        socket.emit('error_message', { error: result.error });
        return;
      }

      if (typeof callback === 'function') callback({ success: true });

      // Notify the removed participant specifically if their socket is active
      const removedSocketId = result.removedParticipant.socketId;
      if (removedSocketId && io.sockets.sockets.get(removedSocketId)) {
        const targetSocket = io.sockets.sockets.get(removedSocketId);
        targetSocket.leave(room.roomId);
        targetSocket.emit('participant_removed', {
          targetParticipantId,
          removedParticipant: result.removedParticipant,
          message: 'You have been removed from the watch party by the host.',
          isSelf: true,
        });
      }

      // Notify the remaining room participants
      io.to(room.roomId).emit('participant_removed', {
        targetParticipantId,
        removedParticipant: result.removedParticipant,
        message: `${result.removedParticipant.name} was removed by the host.`,
        isSelf: false,
      });

      io.to(room.roomId).emit('sync_state', roomManager.getSyncState(room));
    });

    // 11. CHAT MESSAGE
    socket.on('send_chat', ({ text }, callback) => {
      const info = roomManager.getParticipantBySocket(socket.id);
      if (!info) {
        const error = 'Not joined in any active room.';
        if (typeof callback === 'function') callback({ success: false, error });
        socket.emit('error_message', { error });
        return;
      }

      const { room } = info;
      const result = roomManager.addChatMessage(room.roomId, text, socket.id);

      if (!result.success) {
        if (typeof callback === 'function') callback({ success: false, error: result.error });
        socket.emit('error_message', { error: result.error });
        return;
      }

      if (typeof callback === 'function') callback({ success: true, message: result.message });
      io.to(room.roomId).emit('chat_message', { message: result.message });
    });

    // 12. LEAVE ROOM
    socket.on('leave_room', ({ roomId } = {}, callback) => {
      handleUserLeave(socket, io, roomManager, callback);
    });

    // 13. DISCONNECT
    socket.on('disconnect', () => {
      handleUserLeave(socket, io, roomManager);
    });
  });
}

function handleUserLeave(socket, io, roomManager, callback) {
  const result = roomManager.leaveRoom(socket.id);
  if (!result) {
    if (typeof callback === 'function') callback({ success: true });
    return;
  }

  if (result.roomDeleted) {
    socket.leave(result.roomId);
    if (typeof callback === 'function') callback({ success: true, roomDeleted: true });
    return;
  }

  const { room, participant, newHostAssigned, newHost } = result;
  socket.leave(room.roomId);

  if (typeof callback === 'function') callback({ success: true });

  io.to(room.roomId).emit('user_left', {
    participant,
    newHostAssigned,
    newHost,
    message: `${participant.name} left the room.${newHostAssigned ? ` ${newHost.name} is now the host.` : ''}`,
  });

  io.to(room.roomId).emit('sync_state', roomManager.getSyncState(room));
}

module.exports = {
  setupSocketHandlers,
};
