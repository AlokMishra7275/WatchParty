const ioClient = require('socket.io-client');
const request = require('supertest');
const { app, io, server: exportedServer, roomManager } = require('../src/index');

describe('Socket.IO Real-time Integration & REST Tests', () => {
  let port;
  const activeClients = [];

  beforeAll((done) => {
    exportedServer.listen(0, () => {
      port = exportedServer.address().port;
      done();
    });
  });

  afterAll((done) => {
    io.close();
    exportedServer.close(done);
  });

  afterEach(() => {
    while (activeClients.length > 0) {
      const c = activeClients.pop();
      if (c && c.connected) c.disconnect();
    }
  });

  function createConnectedClient() {
    return new Promise((resolve, reject) => {
      const client = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
      });
      activeClients.push(client);

      const timer = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 4000);

      client.on('connect', () => {
        clearTimeout(timer);
        resolve(client);
      });
      client.on('connect_error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  function emitWithAck(client, event, data) {
    return new Promise((resolve) => {
      client.emit(event, data, (response) => {
        resolve(response);
      });
    });
  }

  test('Host creates room, Participant joins, and state is synchronized', async () => {
    const alice = await createConnectedClient();
    const resAlice = await emitWithAck(alice, 'join_room', { name: 'Alice', isCreating: true });
    expect(resAlice.success).toBe(true);
    expect(resAlice.participant.role).toBe('host');
    const roomId = resAlice.roomId;

    const bob = await createConnectedClient();
    const resBob = await emitWithAck(bob, 'join_room', { roomId, name: 'Bob' });
    expect(resBob.success).toBe(true);
    expect(resBob.participant.role).toBe('participant');
    expect(resBob.syncState.participants.length).toBe(2);
  });

  test('Host plays video and everyone in room receives sync_state', async () => {
    const alice = await createConnectedClient();
    const resAlice = await emitWithAck(alice, 'join_room', { name: 'Alice', isCreating: true });
    const roomId = resAlice.roomId;

    const bob = await createConnectedClient();
    await emitWithAck(bob, 'join_room', { roomId, name: 'Bob' });

    const bobStatePromise = new Promise((resolve) => {
      bob.on('sync_state', (state) => {
        if (state.playback.status === 'playing') {
          resolve(state);
        }
      });
    });

    // Alice plays video
    alice.emit('play', { currentTime: 12 });

    const state = await bobStatePromise;
    expect(state.playback.status).toBe('playing');
    expect(state.playback.currentTime).toBeGreaterThanOrEqual(12);
  });

  test('Late-join participant receives current playing playback state', async () => {
    const alice = await createConnectedClient();
    const resAlice = await emitWithAck(alice, 'join_room', { name: 'Alice', isCreating: true });
    const roomId = resAlice.roomId;

    // Alice starts playback at 45 seconds
    await emitWithAck(alice, 'play', { currentTime: 45 });

    // Bob joins later
    const bob = await createConnectedClient();
    const resBob = await emitWithAck(bob, 'join_room', { roomId, name: 'LateBob' });

    expect(resBob.success).toBe(true);
    expect(resBob.syncState.playback.status).toBe('playing');
    expect(resBob.syncState.playback.currentTime).toBeGreaterThanOrEqual(45);
  });

  test('Unauthorized Participant cannot play directly, receives error', async () => {
    const alice = await createConnectedClient();
    const resAlice = await emitWithAck(alice, 'join_room', { name: 'Alice', isCreating: true });
    const roomId = resAlice.roomId;

    const bob = await createConnectedClient();
    await emitWithAck(bob, 'join_room', { roomId, name: 'Bob' });

    const res = await emitWithAck(bob, 'play', { currentTime: 50 });
    expect(res.success).toBe(false);
    expect(res.requiresApproval).toBe(true);
  });

  test('End-to-end Approval Workflow: Request -> Host Approves -> State Updates', async () => {
    const alice = await createConnectedClient();
    const resAlice = await emitWithAck(alice, 'join_room', { name: 'Alice', isCreating: true });
    const roomId = resAlice.roomId;

    const bob = await createConnectedClient();
    await emitWithAck(bob, 'join_room', { roomId, name: 'Bob' });

    // Alice listens for action_requested
    const requestNoticePromise = new Promise((resolve) => {
      alice.on('action_requested', (data) => resolve(data));
    });

    // Bob submits change video request
    const reqRes = await emitWithAck(bob, 'request_action', {
      action: 'change_video',
      payload: { url: 'https://youtu.be/jNQXAC9IVRw' },
    });
    expect(reqRes.success).toBe(true);
    const requestId = reqRes.request.id;

    const noticed = await requestNoticePromise;
    expect(noticed.request.id).toBe(requestId);

    // Bob listens for request_resolved and sync_state
    const bobResolvedPromise = new Promise((resolve) => {
      bob.on('request_resolved', (data) => resolve(data));
    });

    // Alice approves the request
    const approveRes = await emitWithAck(alice, 'approve_request', { requestId });
    expect(approveRes.success).toBe(true);

    const resolvedNotice = await bobResolvedPromise;
    expect(resolvedNotice.executed).toBe(true);
    expect(resolvedNotice.request.status).toBe('approved');
  });

  test('Host removes participant over WebSocket', async () => {
    const alice = await createConnectedClient();
    const resAlice = await emitWithAck(alice, 'join_room', { name: 'Alice', isCreating: true });
    const roomId = resAlice.roomId;

    const bob = await createConnectedClient();
    const resBob = await emitWithAck(bob, 'join_room', { roomId, name: 'Bob' });
    const bobId = resBob.participant.id;

    // Bob listens for participant_removed with isSelf: true
    const bobRemovalPromise = new Promise((resolve) => {
      bob.on('participant_removed', (data) => resolve(data));
    });

    // Alice removes Bob
    const removeRes = await emitWithAck(alice, 'remove_participant', { targetParticipantId: bobId });
    expect(removeRes.success).toBe(true);

    const removedEvent = await bobRemovalPromise;
    expect(removedEvent.isSelf).toBe(true);

    // Bob tries to send chat after removal
    const postRemoveChat = await emitWithAck(bob, 'send_chat', { text: 'Am I still here?' });
    expect(postRemoveChat.success).toBe(false);
  });

  test('Room Isolation: Events in Room A do NOT leak into Room B', async () => {
    const alice = await createConnectedClient();
    const resA = await emitWithAck(alice, 'join_room', { name: 'Alice', isCreating: true });
    const roomAId = resA.roomId;

    const charlie = await createConnectedClient();
    const resB = await emitWithAck(charlie, 'join_room', { name: 'Charlie', isCreating: true });
    const roomBId = resB.roomId;

    expect(roomAId).not.toBe(roomBId);

    let charlieReceivedLeak = false;
    charlie.on('sync_state', (state) => {
      if (state.roomId === roomAId) {
        charlieReceivedLeak = true;
      }
    });

    // Alice triggers play in Room A
    alice.emit('play', { currentTime: 42 });

    await new Promise((r) => setTimeout(r, 200));
    expect(charlieReceivedLeak).toBe(false);
  });

  test('Chat messages are delivered within the room', async () => {
    const alice = await createConnectedClient();
    const resAlice = await emitWithAck(alice, 'join_room', { name: 'Alice', isCreating: true });
    const roomId = resAlice.roomId;

    const bob = await createConnectedClient();
    await emitWithAck(bob, 'join_room', { roomId, name: 'Bob' });

    const chatPromise = new Promise((resolve) => {
      bob.on('chat_message', (data) => {
        resolve(data.message);
      });
    });

    await emitWithAck(alice, 'send_chat', { text: 'Hello Bob!' });
    const message = await chatPromise;
    expect(message.text).toBe('Hello Bob!');
    expect(message.senderName).toBe('Alice');
    expect(message.senderRole).toBe('host');
  });

  // REST API Tests
  describe('REST Endpoints', () => {
    test('GET /api/health returns ok status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(typeof res.body.uptime).toBe('number');
    });

    test('GET /api/rooms/:roomId/validate validates existing and invalid rooms', async () => {
      const { room } = roomManager.createRoom('HostTest');

      const validRes = await request(app).get(`/api/rooms/${room.roomId}/validate`);
      expect(validRes.status).toBe(200);
      expect(validRes.body.valid).toBe(true);

      const invalidRes = await request(app).get('/api/rooms/nonexistent-9999/validate');
      expect(invalidRes.status).toBe(404);
      expect(invalidRes.body.valid).toBe(false);
    });

    test('POST /api/youtube/validate validates URLs', async () => {
      const validRes = await request(app)
        .post('/api/youtube/validate')
        .send({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
      expect(validRes.status).toBe(200);
      expect(validRes.body.valid).toBe(true);
      expect(validRes.body.videoId).toBe('dQw4w9WgXcQ');

      const invalidRes = await request(app)
        .post('/api/youtube/validate')
        .send({ url: 'https://notyoutube.com/invalid' });
      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.valid).toBe(false);
    });
  });
});
