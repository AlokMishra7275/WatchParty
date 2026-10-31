# WatchParty — Full-Stack YouTube Watch Party System

A modern, production-ready, full-stack web application that allows multiple users across the globe to watch YouTube videos together in real time with authoritative synchronization, role-based governance (Host, Moderator, Participant), participant approval queues, room isolation, and live chat.

> **Live Frontend Application:** [https://watch-party-blush-eight.vercel.app/](https://watch-party-blush-eight.vercel.app/)  
> **Live Backend API & WebSocket Service:** [https://watchparty-backend-zk7i.onrender.com/](https://watchparty-backend-zk7i.onrender.com/)  
> **Health Check Endpoint:** [https://watchparty-backend-zk7i.onrender.com/api/health](https://watchparty-backend-zk7i.onrender.com/api/health)

---

## Table of Contents

1. [Features](#features)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Project Directory Structure](#project-directory-structure)
5. [Prerequisites](#prerequisites)
6. [Local Installation & Setup](#local-installation--setup)
7. [Environment Variables](#environment-variables)
8. [Running Locally](#running-locally)
9. [WebSocket Communication & Event Specifications](#websocket-communication--event-specifications)
10. [Room Management & Role Permissions](#room-management--role-permissions)
11. [Playback Synchronization Engine](#playback-synchronization-engine)
12. [Approval Workflow](#approval-workflow)
13. [Testing](#testing)
14. [Deployment Guide (Vercel + Render)](#deployment-guide-vercel--render)
15. [Limitations & Future Roadmap](#limitations--future-roadmap)

---

## Features

- **Real-Time Video Synchronization**: Low-latency video playback sync powered by Socket.IO. Drift correction engine automatically aligns out-of-sync players to the server's authoritative timeline.
- **YouTube URL & ID Integration**: Supports standard YouTube watch URLs (`youtube.com/watch?v=...`), short URLs (`youtu.be/...`), Shorts (`youtube.com/shorts/...`), embed links, and direct 11-character video IDs.
- **Granular Role-Based Access Control (RBAC)**:
  - **Host**: Room creator with supreme authority. Can play, pause, seek, change video, promote participants to Moderator, demote moderators, approve/reject requests, and remove disruptive participants. Automatic host transfer upon host departure ensures rooms never become hostless.
  - **Moderator**: Authorized by the Host to directly control video playback (play, pause, seek, load video) and approve or reject participant requests.
  - **Participant**: Viewers who stay synchronized with the room. Participants cannot directly manipulate video playback; they submit playback change requests to the Approval Queue.
- **Participant Approval Queue**:
  - Participants can submit structured requests to Play, Pause, Seek, or Change Video.
  - Host and Moderators receive real-time notifications with quick Approve / Reject actions.
  - Actions only execute on the server after authorized approval.
- **Room Management & Scoped Isolation**:
  - Server-generated alphanumeric room codes (e.g., `abc-1234`).
  - Strict Socket.IO room segregation: actions, sync states, and chat messages never leak into unrelated rooms.
  - One-click invite link copying.
- **Live In-Room Chat**:
  - Low-latency chat scoped strictly to room members.
  - Role badges displayed beside sender names.
  - Quick emoji reaction picker and auto-scroll.
- **Resilient Reconnection & Late Joins**:
  - Users joining an in-progress video immediately receive current authoritative playback time and status.
  - Automatic reconnection handling with seamless re-sync.
- **Polished Dark Mode & Light Mode System**:
  - Clean, crisp **Light Mode by default** with `#FFFFFF` background, `#111827` typography, and subtle gray borders.
  - Seamless theme toggle button with animated Sun/Moon icons in both the main Navbar and WatchRoom header.
  - Zero-flicker theme persistence via `localStorage` (`watchparty_theme`), restoring user preferences on revisit without startup flashes.
  - Accessible contrast, semantic labels (`aria-label`), and smooth CSS transitions across all cards, modals, controls, chat bubbles, and participants roster.
- **Modern Streaming-Platform UI/UX**:
  - Streaming aesthetic with glassmorphic cards, glowing accents, and clean typography.
  - Accessible playback scrub bar, skip +/-10s buttons, and manual "Sync with Host" button.

---

## Architecture Overview

```text
┌────────────────────────────────────────────────────────┐
│                      Client                            │
│  (React 19 + Vite + Tailwind CSS v4 + React Router)    │
│                                                        │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │ YouTube IFrame Player │  │     RoomContext       │  │
│  │ (Anti-loop drift sync)│  │ (State & Notifications)│  │
│  └───────────▲───────────┘  └───────────▲───────────┘  │
└──────────────┼──────────────────────────┼──────────────┘
               │                          │
          HTTP REST /              Socket.IO Events
        Pre-validation             (Bi-directional)
               │                          │
┌──────────────▼──────────────────────────▼──────────────┐
│                      Backend                           │
│              (Node.js + Express.js)                    │
│                                                        │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │   Socket.IO Server    │  │     RoomManager       │  │
│  │   (Scoped Broadcast)  │◄─┼─►(Authoritative State)│  │
│  └───────────────────────┘  └───────────▲───────────┘  │
│                                         │              │
│                             ┌───────────▼───────────┐  │
│                             │  In-Memory Storage    │  │
│                             │ (Pluggable to MongoDB)│  │
│                             └───────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

1. **Client Layer**: Built with React and Vite. Hosts the embedded YouTube IFrame API. Uses `RoomContext` and `useYouTubePlayer` to bridge user actions and Socket.IO messages while preventing programmatic feedback loops.
2. **Server Layer**: Express.js server providing REST validation endpoints alongside a Socket.IO real-time engine.
3. **Authoritative State Engine**: `RoomManager` holds the true room state (playback time, playback status, participant roles, pending requests). When playback is active, the authoritative timestamp is computed dynamically:
   $$\text{CurrentTime} = \text{AnchorTime} + \frac{\text{Date.now()} - \text{LastUpdated}}{1000} \times \text{PlaybackRate}$$
4. **Data Isolation**: Each room is a dedicated Socket.IO room. Events emitted to `io.to(roomId)` reach only members of that specific room.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, React Router 7, Lucide React icons |
| **Backend** | Node.js (v18+ / v22+), Express.js 4, Socket.IO 4, CORS, Dotenv |
| **Video Integration** | Official YouTube IFrame Player API |
| **Testing** | Jest 29, Supertest 7, Socket.io-client 4 |
| **Deployment Targets** | Frontend: Vercel / Netlify; Backend: Render / Railway |

---

## Project Directory Structure

```text
watchparty/
├── client/                          # React Frontend
│   ├── public/                      # Public static assets
│   ├── src/
│   │   ├── components/              # Modular UI components
│   │   │   ├── ApprovalQueue.jsx    # Review and approve participant requests
│   │   │   ├── ChatBox.jsx          # Real-time room chat
│   │   │   ├── Footer.jsx           # Application footer
│   │   │   ├── Navbar.jsx           # Global navigation with server health
│   │   │   ├── ParticipantsList.jsx # Participant roster & role management
│   │   │   ├── PlaybackControls.jsx # Scrub bar, play/pause, seek, sync buttons
│   │   │   ├── RequestModal.jsx     # Participant action request dialog
│   │   │   ├── RoleBadge.jsx        # Host, Mod, and Participant badges
│   │   │   └── YouTubePlayer.jsx    # 16:9 YouTube iframe container & overlays
│   │   ├── context/
│   │   │   └── RoomContext.jsx      # Central room state and event dispatch
│   │   ├── hooks/
│   │   │   └── useYouTubePlayer.js  # IFrame player lifecycle & anti-loop logic
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx      # Hero, features, create/join flows
│   │   │   ├── WatchRoom.jsx        # Complete watch party room view
│   │   │   └── NotFound.jsx         # 404 handler
│   │   ├── services/
│   │   │   ├── api.js               # REST client (health check, validate)
│   │   │   └── socketService.js     # Socket.IO client singleton
│   │   ├── utils/
│   │   │   ├── formatters.js        # Timestamp & duration formatting
│   │   │   └── youtube.js           # YouTube URL parsing & validation
│   │   ├── App.jsx                  # Route definitions
│   │   ├── index.css                # Tailwind CSS v4 design system
│   │   └── main.jsx                 # React root entry
│   ├── .env.example                 # Frontend environment template
│   ├── package.json                 # Client dependencies & scripts
│   └── vite.config.js               # Vite config with Tailwind & proxy
│
├── server/                          # Node.js Express Backend
│   ├── src/
│   │   ├── config/
│   │   │   └── index.js             # Environment config loader
│   │   ├── middleware/              # CORS and request middleware
│   │   ├── rooms/
│   │   │   └── roomManager.js       # Core room logic, RBAC, and playback math
│   │   ├── sockets/
│   │   │   └── socketHandler.js     # Socket.IO client/server event dispatcher
│   │   ├── utils/
│   │   │   ├── idGenerator.js       # Friendly room codes & ID generator
│   │   │   └── youtube.js           # YouTube URL parsing & validation
│   │   └── index.js                 # Express server entry point
│   ├── tests/
│   │   ├── roomManager.test.js      # Unit tests for room & permission logic
│   │   └── socketIntegration.test.js# Integration tests for real WebSocket flows
│   ├── .env.example                 # Server environment template
│   └── package.json                 # Server dependencies & test scripts
│
├── .gitignore                       # Git ignore configuration
├── package.json                     # Monorepo root scripts
└── README.md                        # Complete project documentation
```

---

## Prerequisites

- **Node.js**: v18.0.0 or later (Node v20 LTS or v22 tested)
- **npm**: v9.0.0 or later
- **Modern Browser**: Chrome, Edge, Firefox, or Safari with JavaScript enabled

---

## Local Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/watchparty.git
   cd watchparty
   ```

2. **Install server dependencies**:
   ```bash
   cd server
   npm install
   cd ..
   ```

3. **Install client dependencies**:
   ```bash
   cd client
   npm install
   cd ..
   ```

---

## Environment Variables

### Server Configuration (`server/.env`)

Copy `server/.env.example` to `server/.env`:
```bash
# In server directory
cp .env.example .env
```

Contents of `server/.env`:
```env
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

- `PORT`: Port the Express server listens on (default: `5000`).
- `CLIENT_URL`: Allowed frontend origin for CORS and Socket.IO.
- `NODE_ENV`: `development`, `production`, or `test`.

### Client Configuration (`client/.env.local` optional in development)

Copy `client/.env.example` to `client/.env.local`:
```env
VITE_SERVER_URL=http://localhost:5000
```
*Note: In development, Vite automatically proxies `/api` requests to `http://localhost:5000` as configured in `client/vite.config.js`.*

---

## Running Locally

You can run both applications concurrently or in separate terminals.

### Option A: Separate Terminals (Recommended for development)

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# Server starts at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# Vite dev server starts at http://localhost:5173
```

### Option B: Root Helper Scripts

From the root directory:
- Run backend: `npm run server`
- Run frontend: `npm run client`
- Run all tests: `npm test`
- Build frontend: `npm run build`

Visit **`http://localhost:5173`** in your browser.

---

## WebSocket Communication & Event Specifications

All real-time communication occurs over Socket.IO. Identity is established via server-side session lookup (`socket.id`), preventing participant spoofing.

### Client-to-Server Events

| Event | Payload | Auth / Role Required | Description |
|---|---|---|---|
| `join_room` | `{ roomId, name, username, isCreating, initialVideoId }` | Anyone | Create a new room as Host or join existing room as Participant. Supports both `name` and `username`. |
| `leave_room` | `{ roomId }` | Room member | Gracefully leaves the room and triggers host transfer if Host leaves. |
| `play` | `{ currentTime, time }` | Host or Moderator | Broadcasts play status from the requested time. Supports `time` and `currentTime`. |
| `pause` | `{ currentTime, time }` | Host or Moderator | Pauses video for everyone at the given time. Supports `time` and `currentTime`. |
| `seek` | `{ currentTime, time }` | Host or Moderator | Seeks all room members to target position. Supports `time` and `currentTime`. |
| `change_video`| `{ url, videoId }` | Host or Moderator | Loads a new YouTube video for all participants (also aliased as `video:change`). |
| `assign_role` | `{ targetParticipantId, userId, newRole, role }` | Host only | Promotes participant to Moderator, demotes to Participant, or transfers Host role. Supports `userId` and `role`. |
| `remove_participant` | `{ targetParticipantId, userId }` | Host only | Expels a participant from the room. Supports `userId` alias. |
| `request_action` | `{ action, payload }` | Participant | Submits a playback action request for approval (also aliased as `video:request`). |
| `approve_request` | `{ requestId }` | Host or Moderator | Approves request and executes playback action. |
| `reject_request` | `{ requestId }` | Host or Moderator | Rejects a pending request. |
| `send_chat` | `{ text }` | Room member | Sends a room-scoped chat message. |

### Server-to-Client Events

| Event | Payload | Description |
|---|---|---|
| `sync_state` | Authoritative room state object (with top-level `playState`, `currentTime`, `videoId`) | Complete state broadcast whenever video, status, or participants change. |
| `user_joined` | `{ participant, message, syncState }` | Notifies room members that a new user joined. |
| `user_left` | `{ participant, newHostAssigned, newHost, message }` | Notifies room that a user left. |
| `role_assigned` | `{ targetParticipant, assignedBy, message }` | Broadcasts role promotion/demotion. |
| `participant_removed` | `{ targetParticipantId, removedParticipant, message, isSelf }` | Broadcasts participant expulsion. |
| `action_requested` | `{ request, message }` | Notifies room of a new pending request. |
| `request_resolved` | `{ request, message, executed }` | Notifies room whether a request was approved or rejected. |
| `chat_message` | `{ message: { id, senderName, senderRole, text, timestamp } }` | New chat message delivered to room. |
| `error_message` | `{ error, requiresApproval }` | Emitted when an action is invalid or unauthorized. |

---

## Room Management & Role Permissions

### Roles & Responsibilities

| Action | Host 👑 | Moderator 🛡️ | Participant 👤 |
|---|:---:|:---:|:---:|
| Play / Pause / Seek | Direct | Direct | Via Approval |
| Change YouTube Video | Direct | Direct | Via Approval |
| Promote to Moderator | Yes | No | No |
| Demote Moderator | Yes | No | No |
| Remove Participant | Yes | No | No |
| Approve / Reject Requests | Yes | Yes | No |
| Chat in Room | Yes | Yes | Yes |
| Force Re-sync | Yes | Yes | Yes |

### Host Continuity & Transfer Logic
1. **Explicit Host Transfer**: The active Host can transfer the Host crown directly to any other room member in the Participants list. The previous host becomes a Moderator.
2. **Automatic Host Succession**: If the Host leaves or closes the tab:
   - If active Moderators exist in the room, the earliest-joined Moderator is promoted to Host.
   - If no Moderators exist, the earliest-joined Participant is promoted to Host.
   - The server broadcasts the new host identity via `user_left`, `role_assigned`, and `sync_state`.

### Room Lifecycle & Disconnection Handling
- **Temporary Network Disconnects (3-Minute Grace Period)**: When a user disconnects abruptly (WiFi drop, tab reload), they are marked `isOnline: false` while their room membership and role are preserved for 3 minutes. If they reconnect within this window, their session and role (including Host) are seamlessly restored.
- **Empty Room Cleanup (5-Minute Expiration)**: When all participants leave a room, a 5-minute cleanup timer begins. If no participant returns within 5 minutes, the room is deleted from server memory to prevent memory leaks.
- **Backend Restarts**: Because rooms are managed in-memory by `RoomManager` (as permitted for the MVP), active rooms reset if the server process restarts.
- **Room Validation**: The REST endpoint `/api/rooms/:roomId/validate` checks room existence and participant count before a user attempts to join, returning an informative 404 message if the room does not exist or has expired.

---

## Playback Synchronization Engine

1. **Anti-Feedback Loop Mechanism**:
   When the client updates the native YouTube player in response to a server `sync_state` event, it sets an internal `isProgrammaticUpdate` flag. The player's native `onStateChange` listener detects this flag and ignores programmatic changes, preventing event echo storms.
2. **Authoritative Timestamp Calculation**:
   When playing, the server computes current video time on-the-fly based on elapsed real-world time:
   $$\text{CurrentSeconds} = \text{StoredSeconds} + (\text{Date.now()} - \text{LastUpdateTimestamp}) / 1000$$
3. **Drift Threshold**:
   Clients compare their local player position with the authoritative server timestamp. If the drift exceeds **1.5 seconds**, the player performs an alignment seek. Differences under 1.5 seconds are allowed to play through smoothly without audio stuttering.

---

## Approval Workflow

1. A Participant wants to play, pause, seek, or change the video.
2. The Participant clicks **"Request Action"** or uses the player controls.
3. The client emits `request_action` with action type and payload.
4. The server validates the request and broadcasts `action_requested` to the room.
5. The Host or Moderator sees the pending request in the **Approval Queue** tab.
6. The authorized user clicks **Approve** or **Reject**:
   - **If Approved**: The server executes `applyPlaybackAction()`, updates room playback state, and broadcasts `request_resolved` along with the new `sync_state`.
   - **If Rejected**: The request is marked rejected with no playback change.

---

## Testing

The project contains unit and integration tests covering all critical requirements:
- Room creation and Host role assignment.
- Participant join and membership synchronization.
- Host playback controls (Play, Pause, Seek, Change Video).
- Rejection of unauthorized participant direct playback events.
- Host promotion of Participant to Moderator.
- Moderator playback control validation.
- Denial of role assignment and removal attempts by Participants.
- Host participant removal.
- Approval workflow validation (action deferred until approved).
- YouTube URL extraction for multiple formats.
- Real Socket.IO connections and strict room isolation.
- Theme preference resolution, OS fallback, and state toggling.

### Running Backend Tests

```bash
cd server
npm test
```

Expected output:
```text
PASS tests/socketIntegration.test.js
PASS tests/roomManager.test.js
PASS tests/theme.test.js

Test Suites: 3 passed, 3 total
Tests:       48 passed, 48 total
```

### Verifying Frontend Production Build

```bash
cd client
npm run build
```

Expected output:
```text
✓ 2083 modules transformed.
✓ built in ~1s
```

---

## Deployment Guide (Vercel + Render)

### Backend Deployment (Render)

1. Create a free account at [render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following configuration:
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. In **Environment Variables**, add:
   - `PORT`: `5000` (or leave to Render's default `$PORT`)
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: `https://watch-party-blush-eight.vercel.app` (your Vercel app URL)
6. Click **Deploy Web Service**.
7. Your live Render backend URL is: `https://watchparty-backend-zk7i.onrender.com`

### Frontend Deployment (Vercel)

1. Create an account at [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository.
4. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. In **Environment Variables**, add:
   - `VITE_SERVER_URL`: `https://watchparty-backend-zk7i.onrender.com` (your deployed Render URL)
6. Click **Deploy**.
7. Once deployed, verify your live frontend URL at `https://watch-party-blush-eight.vercel.app/`.

---

## Limitations & Future Roadmap

- **In-Memory Room Storage**: Active rooms reside in server memory. If the backend process restarts (e.g. cold restart on Render's free tier), active rooms reset. The modular design of `roomManager.js` allows seamless replacement with MongoDB/Mongoose or Redis.
- **YouTube Embedding Restrictions**: Certain music labels and video owners disable embedded playback (`error 101/150`). The application cleanly detects this error and prompts the user to select another video.
- **Browser Autoplay Policies**: Modern browsers restrict unmuted autoplay without prior user interaction. The app includes an "Enable Audio" prompt whenever autoplay audio is blocked.
- **Future Roadmap**:
  - Persistent user accounts with OAuth (Google / GitHub).
  - WebRTC voice/video chat channels for room participants.
  - Collaborative synchronized playlists and video queues.
  - Video history persistence with MongoDB Atlas.

---

## License

ISC License — developed for the Full Stack Development Internship Assessment.
