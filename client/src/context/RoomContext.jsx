import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { socketService } from '../services/socketService';

const RoomContext = createContext(null);

export function RoomProvider({ children }) {
  const [roomId, setRoomId] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('watchparty_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [syncState, setSyncState] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);

  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastNotification({ message, type, id: Date.now() });
    toastTimeoutRef.current = setTimeout(() => {
      setToastNotification(null);
    }, 4000);
  }, []);

  // Save display name
  const saveDisplayName = useCallback((name) => {
    const updated = { ...(currentUser || {}), name };
    setCurrentUser(updated);
    try {
      localStorage.setItem('watchparty_user', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save user to localStorage', e);
    }
  }, [currentUser]);

  // Setup Socket Listeners
  useEffect(() => {
    const socket = socketService.getSocket();

    const onConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const onDisconnect = (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, reconnect manually
        socket.connect();
      }
    };

    const onConnectError = (err) => {
      setIsConnected(false);
      setConnectionError(err.message || 'Connection error');
    };

    const onSyncState = (state) => {
      setSyncState(state);
      // Update currentUser role if in room
      if (state && currentUser?.id) {
        const found = state.participants.find((p) => p.id === currentUser.id);
        if (found && found.role !== currentUser.role) {
          setCurrentUser((prev) => ({ ...prev, role: found.role }));
        }
      }
    };

    const onUserJoined = (data) => {
      showToast(`${data.participant.name} joined the room`, 'info');
      if (data.syncState) setSyncState(data.syncState);
    };

    const onUserLeft = (data) => {
      showToast(data.message, 'info');
      if (data.newHostAssigned && data.newHost?.id === currentUser?.id) {
        showToast('You are now the room Host! 👑', 'success');
      }
    };

    const onRoleAssigned = (data) => {
      showToast(data.message, 'info');
      if (data.targetParticipant?.id === currentUser?.id) {
        showToast(`Your role changed to ${data.targetParticipant.role}!`, 'success');
        setCurrentUser((prev) => ({ ...prev, role: data.targetParticipant.role }));
      }
    };

    const onParticipantRemoved = (data) => {
      if (data.isSelf) {
        showToast('You have been removed from the room by the host.', 'error');
        setRoomId(null);
        setSyncState(null);
      } else {
        showToast(data.message, 'warning');
      }
    };

    const onActionRequested = (data) => {
      showToast(data.message, 'info');
    };

    const onRequestResolved = (data) => {
      const type = data.executed ? 'success' : 'warning';
      showToast(data.message, type);
    };

    const onChatMessage = (data) => {
      setChatMessages((prev) => [...prev.slice(-150), data.message]);
    };

    const onErrorMessage = (data) => {
      showToast(data.error || 'An error occurred', 'error');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('sync_state', onSyncState);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('role_assigned', onRoleAssigned);
    socket.on('participant_removed', onParticipantRemoved);
    socket.on('action_requested', onActionRequested);
    socket.on('request_resolved', onRequestResolved);
    socket.on('chat_message', onChatMessage);
    socket.on('error_message', onErrorMessage);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('sync_state', onSyncState);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('role_assigned', onRoleAssigned);
      socket.off('participant_removed', onParticipantRemoved);
      socket.off('action_requested', onActionRequested);
      socket.off('request_resolved', onRequestResolved);
      socket.off('chat_message', onChatMessage);
      socket.off('error_message', onErrorMessage);
    };
  }, [currentUser?.id, showToast]);

  // Actions
  const join = async ({ targetRoomId, name, isCreating = false, initialVideoId = null }) => {
    const res = await socketService.joinRoom({
      roomId: targetRoomId,
      name,
      isCreating,
      initialVideoId,
    });

    if (res.success) {
      setRoomId(res.roomId);
      setCurrentUser(res.participant);
      setSyncState(res.syncState);
      if (res.chatHistory) setChatMessages(res.chatHistory);
      try {
        localStorage.setItem('watchparty_user', JSON.stringify(res.participant));
      } catch (e) {
        console.warn(e);
      }
    }
    return res;
  };

  const leave = async () => {
    if (roomId) {
      await socketService.leaveRoom(roomId);
      setRoomId(null);
      setSyncState(null);
      setChatMessages([]);
    }
  };

  const playVideo = async (currentTime) => {
    return await socketService.play(currentTime);
  };

  const pauseVideo = async (currentTime) => {
    return await socketService.pause(currentTime);
  };

  const seekVideo = async (currentTime) => {
    return await socketService.seek(currentTime);
  };

  const changeVideo = async (url, videoId) => {
    return await socketService.changeVideo(url, videoId);
  };

  const requestPlaybackAction = async (action, payload) => {
    return await socketService.requestAction(action, payload);
  };

  const approveRequest = async (requestId) => {
    return await socketService.approveRequest(requestId);
  };

  const rejectRequest = async (requestId) => {
    return await socketService.rejectRequest(requestId);
  };

  const assignRole = async (targetParticipantId, newRole) => {
    return await socketService.assignRole(targetParticipantId, newRole);
  };

  const removeParticipant = async (targetParticipantId) => {
    return await socketService.removeParticipant(targetParticipantId);
  };

  const sendMessage = async (text) => {
    return await socketService.sendChat(text);
  };

  // Helper flags
  const role = currentUser?.role || 'participant';
  const isHost = role === 'host';
  const isModerator = role === 'moderator';
  const canControlPlayback = isHost || isModerator;
  const canManageRoles = isHost;
  const canRemoveUsers = isHost;
  const canResolveRequests = isHost || isModerator;

  return (
    <RoomContext.Provider
      value={{
        roomId,
        currentUser,
        role,
        isHost,
        isModerator,
        canControlPlayback,
        canManageRoles,
        canRemoveUsers,
        canResolveRequests,
        syncState,
        chatMessages,
        isConnected,
        connectionError,
        toastNotification,
        showToast,
        saveDisplayName,
        join,
        leave,
        playVideo,
        pauseVideo,
        seekVideo,
        changeVideo,
        requestPlaybackAction,
        approveRequest,
        rejectRequest,
        assignRole,
        removeParticipant,
        sendMessage,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}
