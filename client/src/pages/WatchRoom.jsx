import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Tv,
  Share2,
  Copy,
  Check,
  LogOut,
  Users,
  MessageSquare,
  Hand,
  Sparkles,
  Shield,
  Loader2,
} from 'lucide-react';
import { useRoom } from '../hooks/useRoom';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { PlaybackControls } from '../components/PlaybackControls';
import { ParticipantsList } from '../components/ParticipantsList';
import { ApprovalQueue } from '../components/ApprovalQueue';
import { ChatBox } from '../components/ChatBox';
import { RequestModal } from '../components/RequestModal';
import { RoleBadge } from '../components/RoleBadge';
import { ThemeToggle } from '../components/ThemeToggle';
import { extractYouTubeVideoId } from '../utils/youtube';
import { validateRoom } from '../services/api';
import { cleanRoomCode, copyToClipboard } from '../utils/formatters';

const QUICK_PRESETS = [
  { title: 'Lofi Chill Beats', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
  { title: 'NASA Earth Live', url: 'https://www.youtube.com/watch?v=xRPjKOmdsRA' },
  { title: 'Big Buck Bunny (4K)', url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
];

export function WatchRoom() {
  const { roomId: urlRoomId } = useParams();
  const navigate = useNavigate();

  const {
    roomId,
    currentUser,
    role,
    isHost,
    canControlPlayback,
    canResolveRequests,
    syncState,
    chatMessages,
    isConnected,
    toastNotification,
    showToast,
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
    saveDisplayName,
  } = useRoom();

  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'participants' | 'requests'
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [videoInput, setVideoInput] = useState('');
  const [videoInputError, setVideoInputError] = useState('');
  const [isChangingVideo, setIsChangingVideo] = useState(false);

  // Direct arrival states
  const [promptNameOpen, setPromptNameOpen] = useState(false);
  const [guestName, setGuestName] = useState(currentUser?.name || '');
  const [joiningDirect, setJoiningDirect] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [isValidatingRoom, setIsValidatingRoom] = useState(!roomId && Boolean(urlRoomId));
  const [roomValidationError, setRoomValidationError] = useState('');
  const validatedCodeRef = useRef(null);

  // Request Action Modal
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  // Leave Confirmation
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  // Validate room & handle direct join or prompt on invite arrival
  useEffect(() => {
    let isCancelled = false;
    const targetCode = cleanRoomCode(urlRoomId);

    if (!targetCode) {
      setRoomValidationError('Invalid room link format.');
      setIsValidatingRoom(false);
      return;
    }

    // Already in this room with current session
    if (roomId && cleanRoomCode(roomId) === targetCode) {
      setIsValidatingRoom(false);
      setPromptNameOpen(false);
      return;
    }

    // Avoid multiple redundant validation calls for the same targetCode
    if (validatedCodeRef.current === targetCode && (roomValidationError || promptNameOpen)) {
      setIsValidatingRoom(false);
      return;
    }

    async function checkAndJoin() {
      setIsValidatingRoom(true);
      setRoomValidationError('');
      validatedCodeRef.current = targetCode;

      // 1. Verify that the room actually exists on the server
      const validation = await validateRoom(targetCode);
      if (isCancelled) return;

      if (!validation.valid) {
        setRoomValidationError(validation.error || 'This room does not exist or has ended.');
        setIsValidatingRoom(false);
        return;
      }

      // 2. If user already has a saved display name, attempt auto-join
      if (currentUser?.name) {
        setJoiningDirect(true);
        const res = await join({
          targetRoomId: targetCode,
          name: currentUser.name,
          isCreating: false,
        });

        if (isCancelled) return;
        setJoiningDirect(false);

        if (res.success) {
          setIsValidatingRoom(false);
          setPromptNameOpen(false);
          return;
        }
      }

      // 3. Otherwise show display name entry prompt
      setIsValidatingRoom(false);
      setPromptNameOpen(true);
    }

    checkAndJoin();

    return () => {
      isCancelled = true;
    };
  }, [urlRoomId, roomId, currentUser?.name, join]);

  const handleDirectJoin = async (e) => {
    e.preventDefault();
    const cleanId = cleanRoomCode(urlRoomId);
    if (!guestName.trim() || !cleanId) return;

    setJoiningDirect(true);
    setJoinError('');
    saveDisplayName(guestName.trim());

    const res = await join({
      targetRoomId: cleanId,
      name: guestName.trim(),
      isCreating: false,
    });
    setJoiningDirect(false);

    if (res.success) {
      setPromptNameOpen(false);
    } else {
      setJoinError(res?.error || 'Failed to join room. Please check the room code or try again.');
    }
  };

  // YouTube Player hook integration
  const currentVideoId = syncState?.playback?.videoId || 'dQw4w9WgXcQ';
  const playbackStatus = syncState?.playback?.status || 'paused';

  const onUserPlay = useCallback(
    (time) => {
      if (canControlPlayback) {
        playVideo(time);
      }
    },
    [canControlPlayback, playVideo]
  );

  const onUserPause = useCallback(
    (time) => {
      if (canControlPlayback) {
        pauseVideo(time);
      }
    },
    [canControlPlayback, pauseVideo]
  );

  const onUserSeek = useCallback(
    (time) => {
      if (canControlPlayback) {
        seekVideo(time);
      }
    },
    [canControlPlayback, seekVideo]
  );

  const {
    isReady,
    currentTime,
    duration,
    isMuted,
    playerError,
    autoplayBlocked,
    syncWithServer,
    toggleMute,
  } = useYouTubePlayer({
    containerId: 'yt-player-host',
    initialVideoId: currentVideoId,
    canControl: canControlPlayback,
    enabled: Boolean(roomId && !isValidatingRoom && !promptNameOpen),
    onUserPlay,
    onUserPause,
    onUserSeek,
  });

  // Apply server authoritative sync state to player
  useEffect(() => {
    if (!syncState?.playback) return;
    syncWithServer(syncState.playback);
  }, [syncState, syncWithServer]);

  // Copy Room Link
  const handleCopyLink = async () => {
    const cleanId = cleanRoomCode(urlRoomId || roomId);
    const origin = window.location.origin;
    const url = `${origin}/room/${cleanId}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedLink(true);
      showToast('Invite link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      showToast('Failed to copy invite link', 'error');
    }
  };

  // Copy Room Code
  const handleCopyCode = async () => {
    const cleanId = cleanRoomCode(urlRoomId || roomId);
    if (cleanId) {
      const ok = await copyToClipboard(cleanId);
      if (ok) {
        setCopiedCode(true);
        showToast('Room code copied to clipboard!', 'success');
        setTimeout(() => setCopiedCode(false), 2000);
      }
    }
  };

  // Load / Change Video
  const handleLoadVideo = async (targetUrl = null) => {
    const urlToUse = (typeof targetUrl === 'string' ? targetUrl : videoInput).trim();
    if (!urlToUse) return;

    const validation = extractYouTubeVideoId(urlToUse);
    if (!validation.valid) {
      setVideoInputError(validation.error || 'Invalid YouTube URL');
      return;
    }
    setVideoInputError('');

    if (canControlPlayback) {
      setIsChangingVideo(true);
      const res = await changeVideo(urlToUse, validation.videoId);
      setIsChangingVideo(false);
      if (res && res.success) {
        setVideoInput('');
        showToast('Video changed successfully! 🎬', 'success');
      } else {
        setVideoInputError(res?.error || 'Failed to change video');
      }
    } else {
      setIsChangingVideo(true);
      const res = await requestPlaybackAction('change_video', {
        url: urlToUse,
        videoId: validation.videoId,
      });
      setIsChangingVideo(false);
      if (res && res.success) {
        setVideoInput('');
        showToast('Video change request sent to host! ⏳', 'info');
      } else {
        setVideoInputError(res?.error || 'Failed to submit request');
      }
    }
  };

  const handleForceResync = () => {
    if (syncState?.playback) {
      syncWithServer(syncState.playback);
      showToast('Aligned with host stream', 'info');
    }
  };

  const handleLeaveRoom = async () => {
    await leave();
    navigate('/');
  };

  const pendingRequests = syncState?.pendingRequests || [];
  const participants = syncState?.participants || [];

  if (isValidatingRoom) {
    return (
      <div className="theme-page min-h-screen flex flex-col items-center justify-center p-6 text-[var(--text-main)] transition-colors duration-200">
        <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
        <h2 className="text-lg font-bold mb-1">Joining Watch Party...</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Connecting to room <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{cleanRoomCode(urlRoomId)}</span>
        </p>
      </div>
    );
  }

  if (roomValidationError) {
    return (
      <div className="theme-page min-h-screen flex flex-col items-center justify-center p-6 text-[var(--text-main)] transition-colors duration-200">
        <div className="theme-card border theme-border rounded-3xl max-w-md w-full p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
            <Tv className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold mb-2">Room Not Found</h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-6">
            {roomValidationError}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-page min-h-screen flex flex-col text-[var(--text-main)] transition-colors duration-200">
      {/* Toast Notification */}
      {toastNotification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-3 fade-in duration-300">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2 backdrop-blur-md ${
              toastNotification.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/90 text-red-700 dark:text-red-200 border-red-300 dark:border-red-500/30'
                : toastNotification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/30'
                : toastNotification.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/90 text-amber-700 dark:text-amber-200 border-amber-300 dark:border-amber-500/30'
                : 'theme-card text-[var(--text-main)] theme-border'
            }`}
          >
            <span>{toastNotification.message}</span>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="theme-nav sticky top-0 z-30 w-full border-b theme-border backdrop-blur-md transition-colors duration-200">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand & Room Code */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 p-0.5 shadow-md">
                <div className="w-full h-full bg-[var(--bg-surface)] rounded-[6px] flex items-center justify-center transition-colors">
                  <Tv className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <span className="font-extrabold text-base tracking-tight hidden sm:inline bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
                WatchParty
              </span>
            </button>

            <div className="h-4 w-px bg-[var(--border-main)] hidden sm:block" />

            {/* Room Code Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-card-subtle)] border theme-border text-xs">
              <span className="text-[var(--text-muted)] font-medium">Room:</span>
              <span className="font-mono font-bold text-[var(--text-main)] tracking-wider">
                {urlRoomId}
              </span>
              <button
                onClick={handleCopyCode}
                className="ml-1 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                title="Copy Room Code"
              >
                {copiedCode ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </div>

            {/* Sync Status */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span className="text-[11px] font-semibold">
                {isConnected ? 'In Sync' : 'Connecting...'}
              </span>
            </div>
          </div>

          {/* Right: Role, ThemeToggle, Invite, Count, Leave */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Role Badge */}
            <RoleBadge role={role} size="md" />

            {/* Theme Toggle Button */}
            <ThemeToggle size="sm" />

            {/* Share Room Button */}
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] border theme-border text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Copy invite URL"
            >
              {copiedLink ? (
                <>
                  <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 size={14} />
                  <span className="hidden sm:inline">Invite Link</span>
                </>
              )}
            </button>

            {/* Participant Count */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--bg-card-subtle)] border theme-border text-xs text-[var(--text-muted)]">
              <Users size={13} className="text-[var(--text-muted)]" />
              <span className="font-bold text-[var(--text-main)]">{participants.length}</span>
            </div>

            {/* Leave Room Button */}
            <button
              onClick={() => setLeaveModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--bg-card-subtle)] hover:bg-red-50 dark:hover:bg-red-950/70 text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400 border theme-border hover:border-red-300 dark:hover:border-red-500/40 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              title="Leave Room"
            >
              <LogOut size={13} />
              <span className="hidden md:inline">Leave</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT / MAIN COLUMN: Video & Controls (col-span-8) */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          {/* Reconnecting / Cold-Start Indicator */}
          {!isConnected && roomId && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
              <Loader2 size={14} className="animate-spin flex-shrink-0" />
              <span>Connecting to live sync server... (Free-tier instances may take a few moments to spin up)</span>
            </div>
          )}

          {/* YouTube URL Input Bar */}
          <div className="theme-card p-3 border theme-border rounded-2xl shadow-sm flex flex-col gap-2 transition-colors duration-200">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadVideo()}
                  placeholder="Paste YouTube watch URL, shorts, or youtu.be link..."
                  className="theme-input w-full pl-3.5 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                />
              </div>

              <button
                onClick={() => handleLoadVideo()}
                disabled={isChangingVideo || !videoInput.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer flex-shrink-0"
              >
                {isChangingVideo ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                <span>{canControlPlayback ? 'Change Video' : 'Request Video'}</span>
              </button>
            </div>

            {videoInputError && (
              <p className="text-xs text-red-500 dark:text-red-400 px-1">{videoInputError}</p>
            )}

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-2 pt-1 overflow-x-auto text-xs text-[var(--text-muted)]">
              <span className="text-[11px] font-semibold text-[var(--text-muted)]">Trending:</span>
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.title}
                  onClick={() => handleLoadVideo(preset.url)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] border theme-border text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all whitespace-nowrap cursor-pointer text-[11px]"
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          {/* YouTube Embedded Player */}
          <YouTubePlayer
            containerId="yt-player-host"
            isReady={isReady}
            playbackStatus={playbackStatus}
            playerError={playerError}
            autoplayBlocked={autoplayBlocked}
            onUnmute={toggleMute}
          />

          {/* Playback Controls Bar */}
          <PlaybackControls
            isPlaying={playbackStatus === 'playing'}
            currentTime={currentTime}
            duration={duration}
            canControl={canControlPlayback}
            isMuted={isMuted}
            onPlay={() => {
              if (canControlPlayback) playVideo(currentTime);
            }}
            onPause={() => {
              if (canControlPlayback) pauseVideo(currentTime);
            }}
            onSeek={(targetTime) => {
              if (canControlPlayback) seekVideo(targetTime);
            }}
            onToggleMute={toggleMute}
            onForceResync={handleForceResync}
            onRequestAction={(action) => {
              requestPlaybackAction(action, { currentTime });
            }}
          />

          {/* Role Status Notice for Participants */}
          {!canControlPlayback && (
            <div className="p-3.5 rounded-2xl theme-card border theme-border flex items-center justify-between gap-3 text-xs text-[var(--text-muted)] transition-colors">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                <span>
                  You are viewing as <strong className="text-[var(--text-main)]">Participant</strong>. Playback is synchronized with the Host.
                </span>
              </div>
              <button
                onClick={() => setRequestModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] text-indigo-700 dark:text-indigo-300 border theme-border text-xs font-semibold transition-colors cursor-pointer flex-shrink-0"
              >
                <Hand size={13} className="text-amber-500 dark:text-amber-400" />
                <span>Request Action</span>
              </button>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Sidebar with Tabs (col-span-4) */}
        <aside className="lg:col-span-4 flex flex-col h-[650px] lg:h-[calc(100vh-130px)] theme-card border theme-border rounded-2xl overflow-hidden shadow-sm transition-colors duration-200">
          {/* Tab Navigation Header */}
          <div className="flex items-center border-b theme-border bg-[var(--bg-card-subtle)] p-1.5">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <MessageSquare size={14} />
              <span>Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'participants'
                  ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Users size={14} />
              <span>Users ({participants.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                activeTab === 'requests'
                  ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Hand size={14} />
              <span>Requests</span>
              {pendingRequests.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white leading-none shadow-sm animate-pulse">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content Panes */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' && (
              <ChatBox
                messages={chatMessages}
                currentUserId={currentUser?.id}
                onSendMessage={sendMessage}
              />
            )}

            {activeTab === 'participants' && (
              <ParticipantsList
                participants={participants}
                currentUserId={currentUser?.id}
                isHost={isHost}
                onAssignRole={assignRole}
                onRemoveParticipant={removeParticipant}
              />
            )}

            {activeTab === 'requests' && (
              <ApprovalQueue
                pendingRequests={pendingRequests}
                resolvedRequests={syncState?.resolvedRequests || []}
                currentUserId={currentUser?.id}
                canResolve={canResolveRequests}
                onApprove={approveRequest}
                onReject={rejectRequest}
                onRequestNew={() => setRequestModalOpen(true)}
              />
            )}
          </div>
        </aside>
      </main>

      {/* REQUEST MODAL */}
      <RequestModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSubmitRequest={requestPlaybackAction}
        currentDuration={duration}
      />

      {/* DIRECT JOIN NAME PROMPT MODAL */}
      {promptNameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md">
          <div className="theme-card border theme-border rounded-3xl w-full max-w-sm p-6 shadow-2xl transition-colors duration-200">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">Join Watch Party</h3>
            <p className="text-xs text-[var(--text-muted)] mb-5">
              Enter your display name to join room <strong className="text-indigo-600 dark:text-indigo-400">{cleanRoomCode(urlRoomId)}</strong>
            </p>

            {joinError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                {joinError}
              </div>
            )}

            <form onSubmit={handleDirectJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-main)] mb-1.5">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Jordan"
                  maxLength={30}
                  className="theme-input w-full px-4 py-2.5 rounded-xl border text-sm placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 shadow-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] theme-text-main border theme-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joiningDirect || !guestName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {joiningDirect && <Loader2 size={14} className="animate-spin" />}
                  <span>{joiningDirect ? 'Entering...' : 'Enter Party'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAVE CONFIRMATION MODAL */}
      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="theme-card border theme-border rounded-3xl w-full max-w-sm p-6 shadow-2xl transition-colors duration-200">
            <h3 className="text-base font-bold text-[var(--text-main)] mb-2">Leave Watch Party?</h3>
            <p className="text-xs text-[var(--text-muted)] mb-5">
              {isHost
                ? 'As the Host, leaving will automatically transfer Host ownership to another member.'
                : 'You will disconnect from this synchronized session.'}
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setLeaveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] border theme-border transition-colors cursor-pointer"
              >
                Stay
              </button>
              <button
                onClick={handleLeaveRoom}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors cursor-pointer"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
