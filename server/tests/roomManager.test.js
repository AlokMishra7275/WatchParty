const { RoomManager, ROLES, PLAYBACK_STATUS } = require('../src/rooms/roomManager');
const { extractYouTubeVideoId } = require('../src/utils/youtube');

describe('RoomManager Unit Tests', () => {
  let roomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  test('1 & 2: User can create a room and receives Host status', () => {
    const { room, host } = roomManager.createRoom('Alice', 'socket_alice');
    expect(room).toBeDefined();
    expect(room.roomId).toBeDefined();
    expect(host.role).toBe(ROLES.HOST);
    expect(host.name).toBe('Alice');
    expect(room.hostId).toBe(host.id);
    expect(room.participants.get(host.id)).toBeDefined();
  });

  test('3 & 4: Second user joins as Participant and membership is updated', () => {
    const { room } = roomManager.createRoom('Alice', 'socket_alice');
    const joinResult = roomManager.joinRoom(room.roomId, 'Bob', 'socket_bob');

    expect(joinResult.success).toBe(true);
    expect(joinResult.participant.role).toBe(ROLES.PARTICIPANT);
    expect(joinResult.participant.name).toBe('Bob');
    expect(room.participants.size).toBe(2);
  });

  test('5 & 6: Host can play, pause, seek, and change video', () => {
    const { room } = roomManager.createRoom('Alice', 'socket_alice');

    // Play
    const playRes = roomManager.updatePlayback(room.roomId, 'play', { currentTime: 15 }, 'socket_alice');
    expect(playRes.success).toBe(true);
    expect(room.playback.status).toBe(PLAYBACK_STATUS.PLAYING);

    // Pause
    const pauseRes = roomManager.updatePlayback(room.roomId, 'pause', { currentTime: 25 }, 'socket_alice');
    expect(pauseRes.success).toBe(true);
    expect(room.playback.status).toBe(PLAYBACK_STATUS.PAUSED);

    // Seek
    const seekRes = roomManager.updatePlayback(room.roomId, 'seek', { currentTime: 60 }, 'socket_alice');
    expect(seekRes.success).toBe(true);
    expect(room.playback.currentTime).toBe(60);

    // Change video
    const changeRes = roomManager.updatePlayback(
      room.roomId,
      'change_video',
      { url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' },
      'socket_alice'
    );
    expect(changeRes.success).toBe(true);
    expect(room.playback.videoId).toBe('jNQXAC9IVRw');
  });

  test('7: Unauthorized Participant cannot directly execute playback events', () => {
    const { room } = roomManager.createRoom('Alice', 'socket_alice');
    roomManager.joinRoom(room.roomId, 'Bob', 'socket_bob');

    const bobPlay = roomManager.updatePlayback(room.roomId, 'play', { currentTime: 10 }, 'socket_bob');
    expect(bobPlay.success).toBe(false);
    expect(bobPlay.requiresApproval).toBe(true);

    const bobPause = roomManager.updatePlayback(room.roomId, 'pause', { currentTime: 10 }, 'socket_bob');
    expect(bobPause.success).toBe(false);

    const bobSeek = roomManager.updatePlayback(room.roomId, 'seek', { currentTime: 40 }, 'socket_bob');
    expect(bobSeek.success).toBe(false);

    const bobChange = roomManager.updatePlayback(
      room.roomId,
      'change_video',
      { url: 'https://youtu.be/9bZkp7q19f0' },
      'socket_bob'
    );
    expect(bobChange.success).toBe(false);
  });

  test('8 & 9: Host can promote Participant to Moderator and Moderator can control playback', () => {
    const { room } = roomManager.createRoom('Alice', 'socket_alice');
    const { participant: bob } = roomManager.joinRoom(room.roomId, 'Bob', 'socket_bob');

    // Alice promotes Bob to Moderator
    const promoteRes = roomManager.assignRole(room.roomId, bob.id, ROLES.MODERATOR, 'socket_alice');
    expect(promoteRes.success).toBe(true);
    expect(bob.role).toBe(ROLES.MODERATOR);

    // Bob can now control playback
    const bobPlay = roomManager.updatePlayback(room.roomId, 'play', { currentTime: 30 }, 'socket_bob');
    expect(bobPlay.success).toBe(true);
    expect(room.playback.status).toBe(PLAYBACK_STATUS.PLAYING);
  });

  test('10: Participant cannot assign roles or remove users', () => {
    const { room, host: alice } = roomManager.createRoom('Alice', 'socket_alice');
    const { participant: bob } = roomManager.joinRoom(room.roomId, 'Bob', 'socket_bob');
    const { participant: charlie } = roomManager.joinRoom(room.roomId, 'Charlie', 'socket_charlie');

    // Bob tries to promote Charlie
    const badPromote = roomManager.assignRole(room.roomId, charlie.id, ROLES.MODERATOR, 'socket_bob');
    expect(badPromote.success).toBe(false);

    // Bob tries to remove Charlie
    const badRemove = roomManager.removeParticipant(room.roomId, charlie.id, 'socket_bob');
    expect(badRemove.success).toBe(false);
  });

  test('Moderator cannot assign roles or remove users (Host-only permissions)', () => {
    const { room } = roomManager.createRoom('Alice', 'socket_alice');
    const { participant: bob } = roomManager.joinRoom(room.roomId, 'Bob', 'socket_bob');
    const { participant: charlie } = roomManager.joinRoom(room.roomId, 'Charlie', 'socket_charlie');

    // Alice promotes Bob to Moderator
    roomManager.assignRole(room.roomId, bob.id, ROLES.MODERATOR, 'socket_alice');

    // Bob (Moderator) tries to assign role
    const modAssign = roomManager.assignRole(room.roomId, charlie.id, ROLES.MODERATOR, 'socket_bob');
    expect(modAssign.success).toBe(false);
    expect(modAssign.error).toMatch(/Only the Host/);

    // Bob (Moderator) tries to remove user
    const modRemove = roomManager.removeParticipant(room.roomId, charlie.id, 'socket_bob');
    expect(modRemove.success).toBe(false);
    expect(modRemove.error).toMatch(/Only the Host/);
  });

  test('11: Host can remove a participant and removed participant cannot act', () => {
    const { room } = roomManager.createRoom('Alice', 'socket_alice');
    const { participant: bob } = roomManager.joinRoom(room.roomId, 'Bob', 'socket_bob');

    const removeRes = roomManager.removeParticipant(room.roomId, bob.id, 'socket_alice');
    expect(removeRes.success).toBe(true);
    expect(room.participants.has(bob.id)).toBe(false);

    // Bob tries to play after being removed
    const badAct = roomManager.updatePlayback(room.roomId, 'play', { currentTime: 0 }, 'socket_bob');
    expect(badAct.success).toBe(false);
  });

  test('12 & 13: Approval workflow — action not executed before approval, executes after approval', () => {
    const { room } = roomManager.createRoom('Alice', 'socket_alice');
    const { participant: bob } = roomManager.joinRoom(room.roomId, 'Bob', 'socket_bob');

    // Bob requests change video
    const reqRes = roomManager.requestAction(
      room.roomId,
      'change_video',
      { url: 'https://youtu.be/9bZkp7q19f0' },
      'socket_bob'
    );
    expect(reqRes.success).toBe(true);
    expect(reqRes.request.status).toBe('pending');
    expect(room.playback.videoId).not.toBe('9bZkp7q19f0');

    // Alice approves request
    const resolveRes = roomManager.resolveRequest(room.roomId, reqRes.request.id, true, 'socket_alice');
    expect(resolveRes.success).toBe(true);
    expect(resolveRes.request.status).toBe('approved');
    expect(room.playback.videoId).toBe('9bZkp7q19f0');
  });

  test('Participant CANNOT approve or reject requests', () => {
    const { room } = roomManager.createRoom('Alice', 'socket_alice');
    const { participant: bob } = roomManager.joinRoom(room.roomId, 'Bob', 'socket_bob');
    const { participant: charlie } = roomManager.joinRoom(room.roomId, 'Charlie', 'socket_charlie');

    const reqRes = roomManager.requestAction(room.roomId, 'play', { currentTime: 5 }, 'socket_charlie');
    expect(reqRes.success).toBe(true);

    // Bob (Participant) tries to approve Charlie's request
    const badApprove = roomManager.resolveRequest(room.roomId, reqRes.request.id, true, 'socket_bob');
    expect(badApprove.success).toBe(false);
    expect(badApprove.error).toMatch(/Unauthorized/);
  });

  test('Rejected requests do NOT execute playback changes', () => {
    const { room } = roomManager.createRoom('Alice', 'socket_alice');
    const { participant: bob } = roomManager.joinRoom(room.roomId, 'Bob', 'socket_bob');

    const reqRes = roomManager.requestAction(
      room.roomId,
      'change_video',
      { url: 'https://youtu.be/9bZkp7q19f0' },
      'socket_bob'
    );

    // Alice rejects request
    const rejectRes = roomManager.resolveRequest(room.roomId, reqRes.request.id, false, 'socket_alice');
    expect(rejectRes.success).toBe(true);
    expect(rejectRes.request.status).toBe('rejected');
    expect(rejectRes.executed).toBe(false);
    // Video remains unchanged
    expect(room.playback.videoId).not.toBe('9bZkp7q19f0');
  });

  test('14: Host departure transfers ownership cleanly', () => {
    const { room } = roomManager.createRoom('Alice', 'socket_alice');
    const { participant: bob } = roomManager.joinRoom(room.roomId, 'Bob', 'socket_bob');

    // Alice leaves
    const leaveRes = roomManager.leaveRoom('socket_alice');
    expect(leaveRes.roomDeleted).toBe(false);
    expect(leaveRes.newHostAssigned).toBe(true);
    expect(bob.role).toBe(ROLES.HOST);
    expect(room.hostId).toBe(bob.id);
  });

  test('Authoritative playback calculation computes elapsed time during play', () => {
    const { room } = roomManager.createRoom('Alice', 'socket_alice');

    // Initially paused at 0
    expect(roomManager.getAuthoritativePlaybackTime(room)).toBe(0);

    // Play at 10s
    roomManager.updatePlayback(room.roomId, 'play', { currentTime: 10 }, 'socket_alice');
    // Set lastUpdated to 2 seconds ago
    room.playback.lastUpdated = Date.now() - 2000;

    const computed = roomManager.getAuthoritativePlaybackTime(room);
    expect(computed).toBeGreaterThanOrEqual(11.9);
    expect(computed).toBeLessThanOrEqual(12.5);
  });

  test('Reconnection restores participant role and mapping', () => {
    const { room, host: alice } = roomManager.createRoom('Alice', 'socket_alice_1');
    const { participant: bob } = roomManager.joinRoom(room.roomId, 'Bob', 'socket_bob_1');

    // Alice promotes Bob to Moderator
    roomManager.assignRole(room.roomId, bob.id, ROLES.MODERATOR, 'socket_alice_1');

    // Bob reconnects with new socket ID but same participantId
    const reconnectRes = roomManager.joinRoom(room.roomId, 'Bob', 'socket_bob_2', bob.id);
    expect(reconnectRes.success).toBe(true);
    expect(reconnectRes.isReconnection).toBe(true);
    expect(reconnectRes.participant.role).toBe(ROLES.MODERATOR);
    expect(reconnectRes.participant.socketId).toBe('socket_bob_2');
    expect(roomManager.getParticipantBySocket('socket_bob_2').participant.id).toBe(bob.id);
  });

  test('15: YouTube URL validation handles various formats', () => {
    // Standard watch
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ').valid).toBe(true);
    // youtu.be
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ').valid).toBe(true);
    // Shorts
    expect(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ').valid).toBe(true);
    // Embed
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ').valid).toBe(true);
    // Raw 11-char ID
    expect(extractYouTubeVideoId('dQw4w9WgXcQ').valid).toBe(true);
    // Invalid URLs
    expect(extractYouTubeVideoId('https://vimeo.com/12345').valid).toBe(false);
    expect(extractYouTubeVideoId('invalid_id').valid).toBe(false);
    expect(extractYouTubeVideoId('').valid).toBe(false);
  });

  test('Authoritative sync state includes isPlaying, updatedAt, and hostId', () => {
    const { room, host } = roomManager.createRoom('Alice', 'socket_alice');
    const syncState = roomManager.getSyncState(room);

    expect(syncState.hostId).toBe(host.id);
    expect(syncState.playback.hostId).toBe(host.id);
    expect(syncState.playback.videoId).toBeDefined();
    expect(syncState.playback.isPlaying).toBe(false);
    expect(typeof syncState.playback.currentTime).toBe('number');
    expect(typeof syncState.playback.updatedAt).toBe('number');
    expect(typeof syncState.playback.serverTimestamp).toBe('number');

    // Host plays
    roomManager.updatePlayback(room.roomId, 'play', { currentTime: 25 }, 'socket_alice');
    const playingState = roomManager.getSyncState(room);
    expect(playingState.playback.isPlaying).toBe(true);
    expect(playingState.playback.status).toBe('playing');
    expect(playingState.playback.currentTime).toBeGreaterThanOrEqual(25);
  });

  test('Chat permission and messaging for Host, Moderator, and Participant', () => {
    const { room, host: alice } = roomManager.createRoom('Alice', 'socket_alice');
    const { participant: bob } = roomManager.joinRoom(room.roomId, 'Bob', 'socket_bob');
    const { participant: charlie } = roomManager.joinRoom(room.roomId, 'Charlie', 'socket_charlie');

    roomManager.assignRole(room.roomId, bob.id, ROLES.MODERATOR, 'socket_alice');

    // Host can send chat
    const hostMsg = roomManager.addChatMessage(room.roomId, 'Welcome all!', 'socket_alice');
    expect(hostMsg.success).toBe(true);
    expect(hostMsg.message.senderName).toBe('Alice');
    expect(hostMsg.message.senderRole).toBe(ROLES.HOST);

    // Moderator can send chat
    const modMsg = roomManager.addChatMessage(room.roomId, 'Hello everyone!', 'socket_bob');
    expect(modMsg.success).toBe(true);
    expect(modMsg.message.senderRole).toBe(ROLES.MODERATOR);

    // Participant can send chat
    const partMsg = roomManager.addChatMessage(room.roomId, 'Excited to watch!', 'socket_charlie');
    expect(partMsg.success).toBe(true);
    expect(partMsg.message.senderRole).toBe(ROLES.PARTICIPANT);

    // Socket not in room cannot send chat
    const unauthMsg = roomManager.addChatMessage(room.roomId, 'Hacker', 'socket_unknown');
    expect(unauthMsg.success).toBe(false);
  });

  test('Same socket re-joining the same room preserves Host membership', () => {
    const { room, host: alice } = roomManager.createRoom('Alice', 'socket_alice');

    // Emulate client calling joinRoom with same socket in same room
    const reJoin = roomManager.joinRoom(room.roomId, 'Alice', 'socket_alice');
    expect(reJoin.success).toBe(true);
    expect(reJoin.participant.id).toBe(alice.id);
    expect(reJoin.participant.role).toBe(ROLES.HOST);
    expect(room.hostId).toBe(alice.id);
    expect(room.participants.get(alice.id)).toBeDefined();
  });
});
