import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Users,
  Play,
  Shield,
  Radio,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { validateRoom } from '../services/api';
import { useRoom } from '../hooks/useRoom';
import { cleanRoomCode } from '../utils/formatters';
import { extractYouTubeVideoId } from '../utils/youtube';

export function LandingPage() {
  const navigate = useNavigate();
  const { join, saveDisplayName, currentUser } = useRoom();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  // Form states
  const [hostName, setHostName] = useState(currentUser?.name || '');
  const [initialVideoUrl, setInitialVideoUrl] = useState('');

  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joinName, setJoinName] = useState(currentUser?.name || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Direct hero join
  const [heroCode, setHeroCode] = useState('');

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!hostName.trim()) {
      setErrorMsg('Please enter your display name');
      return;
    }

    let initialVideoId = null;
    if (initialVideoUrl.trim()) {
      const extracted = extractYouTubeVideoId(initialVideoUrl.trim());
      if (extracted.valid) {
        initialVideoId = extracted.videoId;
      } else {
        setErrorMsg('Please enter a valid YouTube video URL or ID');
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');

    try {
      saveDisplayName(hostName.trim());
      const res = await join({
        name: hostName.trim(),
        isCreating: true,
        initialVideoId,
      });

      setLoading(false);
      if (res && res.success) {
        navigate(`/room/${res.roomId}`);
      } else {
        setErrorMsg(res?.error || 'Failed to create room. Please try again.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg('Failed to connect to server: ' + err.message);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    const code = (joinRoomCode || heroCode).trim();
    if (!code) {
      setErrorMsg('Please enter a room code');
      return;
    }
    if (!joinName.trim()) {
      setErrorMsg('Please enter your display name');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const cleanCode = cleanRoomCode(code);
      if (!cleanCode) {
        setLoading(false);
        setErrorMsg('Please enter a valid room code or invite link');
        return;
      }

      const validation = await validateRoom(cleanCode);
      if (!validation.valid) {
        setLoading(false);
        setErrorMsg(validation.error || 'Room does not exist or has closed.');
        return;
      }

      saveDisplayName(joinName.trim());
      const res = await join({
        targetRoomId: cleanCode,
        name: joinName.trim(),
        isCreating: false,
      });

      setLoading(false);
      if (res && res.success) {
        navigate(`/room/${cleanCode}`);
      } else {
        setErrorMsg(res?.error || 'Could not join room');
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg('Could not join room: ' + err.message);
    }
  };

  return (
    <div className="theme-page min-h-screen flex flex-col transition-colors duration-200">
      <Navbar
        onOpenCreateModal={() => { setCreateModalOpen(true); setErrorMsg(''); }}
        onOpenJoinModal={() => { setJoinModalOpen(true); setErrorMsg(''); }}
      />

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-indigo-500/10 via-violet-500/10 to-pink-500/5 dark:from-indigo-600/20 dark:via-violet-600/10 dark:to-pink-500/10 blur-[130px] rounded-full pointer-events-none" />

        {/* Top pill badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-8 animate-in fade-in duration-500">
          <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400" />
          <span>Real-time YouTube Synchronization &amp; Role Governance</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6 theme-text-main">
          Watch Together.{' '}
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400 bg-clip-text text-transparent">
            Anywhere.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-[var(--text-muted)] max-w-2xl mb-10 leading-relaxed font-normal">
          Experience synchronized YouTube playback with friends. Low-latency streaming,
          authoritative Host controls, Moderator permissions, and participant approval requests.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md mb-12">
          <button
            onClick={() => { setCreateModalOpen(true); setErrorMsg(''); }}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-xl shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Sparkles size={16} />
            <span>Create Watch Party</span>
          </button>

          <button
            onClick={() => { setJoinModalOpen(true); setErrorMsg(''); }}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] theme-text-main border theme-border transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm cursor-pointer"
          >
            <Users size={16} />
            <span>Join a Room</span>
          </button>
        </div>

        {/* Quick Hero Room Code Input */}
        <div className="theme-card w-full max-w-md p-2 rounded-2xl border backdrop-blur-md flex items-center gap-2 shadow-lg">
          <input
            type="text"
            value={heroCode}
            onChange={(e) => setHeroCode(e.target.value)}
            placeholder="Enter Room Code (e.g. abc-1234)..."
            className="flex-1 bg-transparent px-3 py-2 text-sm theme-text-main placeholder-[var(--text-faint)] focus:outline-none"
          />
          <button
            onClick={() => {
              if (heroCode.trim()) {
                setJoinRoomCode(heroCode.trim());
                setJoinModalOpen(true);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] theme-text-main border theme-border transition-colors cursor-pointer"
          >
            <span>Join</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Mockup Preview Card */}
        <div className="mt-16 w-full max-w-5xl rounded-3xl p-2 bg-gradient-to-b from-indigo-500/20 via-violet-500/10 to-transparent border theme-border shadow-2xl">
          <div className="theme-card rounded-2xl border overflow-hidden shadow-sm">
            {/* Window bar */}
            <div className="px-4 py-3 bg-[var(--bg-card-subtle)] border-b theme-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-amber-500/70" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
                <span className="text-xs text-[var(--text-faint)] font-mono ml-2">watchparty.live/room/wtch-8921</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <Radio size={10} className="animate-pulse" /> Live In Sync
                </span>
              </div>
            </div>

            {/* Mockup content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 theme-card">
              <div className="lg:col-span-2 aspect-video bg-gradient-to-tr from-zinc-200/50 via-zinc-100 to-indigo-100/30 dark:from-zinc-900 dark:via-zinc-950 dark:to-indigo-950/40 rounded-xl border theme-border flex flex-col items-center justify-center relative group p-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/30 dark:border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-lg shadow-indigo-500/10">
                  <Play size={28} className="ml-1" />
                </div>
                <p className="text-sm font-bold theme-text-main">Synchronized YouTube Player</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Host authoritative playback with sub-second alignment</p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="theme-card p-3.5 rounded-xl border text-left shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold theme-text-main">Active Participants</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">3 online</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="theme-text-main font-medium">Alex (Host)</span>
                      <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">Host 👑</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="theme-text-main font-medium">Sarah</span>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-bold">Mod 🛡️</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">Guest 3</span>
                      <span className="text-[10px] bg-[var(--bg-card-subtle)] text-[var(--text-muted)] px-2 py-0.5 rounded-full font-medium border theme-border">Viewer</span>
                    </div>
                  </div>
                </div>

                <div className="theme-card p-3.5 rounded-xl border text-left flex-1 flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-xs font-bold theme-text-main">Approval Queue</span>
                    <div className="theme-card-subtle mt-2 p-2 rounded-lg border text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] theme-text-main font-medium">Guest 3 requested Seek</span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Pending</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t theme-border flex items-center justify-between text-[11px] text-[var(--text-faint)]">
                    <span>WebSocket Connected</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">0.05s latency</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t theme-border">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold theme-text-main mb-4">
            Engineered for Flawless Shared Viewing
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-muted)]">
            Everything you need to host YouTube watch sessions with full security,
            streamlined permissions, and zero video drift.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="theme-card p-6 rounded-2xl border hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
              <Radio size={22} />
            </div>
            <h3 className="text-base font-bold theme-text-main mb-2">Sub-Second Sync</h3>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Authoritative server timing eliminates drift. Play, pause, and seek events
              propagate instantaneously to every participant.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="theme-card p-6 rounded-2xl border hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm transition-all">
            <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-600/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4">
              <Shield size={22} />
            </div>
            <h3 className="text-base font-bold theme-text-main mb-2">Role Governance</h3>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Granular access control: Host has complete ownership, Moderators handle playback,
              and unauthorized viewers cannot disrupt the party.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="theme-card p-6 rounded-2xl border hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm transition-all">
            <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-600/10 border border-pink-200 dark:border-pink-500/20 flex items-center justify-center text-pink-600 dark:text-pink-400 mb-4">
              <Sparkles size={22} />
            </div>
            <h3 className="text-base font-bold theme-text-main mb-2">Approval Queue</h3>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Participants can request playback changes or suggest new videos. Hosts and
              Moderators review and approve before any state changes.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works & Roles */}
      <section id="roles" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t theme-border">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold theme-text-main mb-4">
            Role-Based Permissions Matrix
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-muted)]">
            Backed by strict server-side validation. No client-side trust.
          </p>
        </div>

        <div className="theme-card overflow-x-auto rounded-2xl border shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b theme-border bg-[var(--bg-card-subtle)] theme-text-main">
                <th className="p-4 font-bold">Capability</th>
                <th className="p-4 font-bold text-amber-600 dark:text-amber-400">Host 👑</th>
                <th className="p-4 font-bold text-indigo-600 dark:text-indigo-400">Moderator 🛡️</th>
                <th className="p-4 font-bold text-[var(--text-muted)]">Participant 👤</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border theme-text-main">
              <tr>
                <td className="p-4 font-semibold">Play, Pause &amp; Seek</td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold">Direct</td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold">Direct</td>
                <td className="p-4 text-amber-600 dark:text-amber-400 font-semibold">Via Approval</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Change YouTube Video</td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold">Direct</td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold">Direct</td>
                <td className="p-4 text-amber-600 dark:text-amber-400 font-semibold">Via Approval</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Promote to Moderator</td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold">Yes</td>
                <td className="p-4 text-red-600 dark:text-red-400 font-medium">No</td>
                <td className="p-4 text-red-600 dark:text-red-400 font-medium">No</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Remove Participants</td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold">Yes</td>
                <td className="p-4 text-red-600 dark:text-red-400 font-medium">No</td>
                <td className="p-4 text-red-600 dark:text-red-400 font-medium">No</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Approve / Reject Requests</td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold">Yes</td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold">Yes</td>
                <td className="p-4 text-red-600 dark:text-red-400 font-medium">No</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* CREATE ROOM MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="theme-card border rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative transition-colors duration-200">
            <h3 className="text-xl font-bold theme-text-main mb-2">Create Watch Party</h3>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-6">
              You will enter as the Host with full control over the room and playback.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold theme-text-main mb-1.5">
                  Your Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="e.g. Alex"
                  maxLength={30}
                  className="theme-input w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-main mb-1.5">
                  Initial YouTube URL (Optional)
                </label>
                <input
                  type="text"
                  value={initialVideoUrl}
                  onChange={(e) => setInitialVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="theme-input w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                />
                <span className="text-[11px] text-[var(--text-faint)] mt-1 block">
                  Leave blank to start with our default video.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] theme-text-main border theme-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  <span>{loading ? 'Creating...' : 'Create & Enter Room'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN ROOM MODAL */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="theme-card border rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative transition-colors duration-200">
            <h3 className="text-xl font-bold theme-text-main mb-2">Join a Watch Party</h3>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-6">
              Enter the room code or invite link provided by your host.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold theme-text-main mb-1.5">
                  Room Code or Link *
                </label>
                <input
                  type="text"
                  required
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value)}
                  placeholder="e.g. abc-1234"
                  className="theme-input w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-main mb-1.5">
                  Your Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="e.g. Taylor"
                  maxLength={30}
                  className="theme-input w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setJoinModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] theme-text-main border theme-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  <span>{loading ? 'Joining...' : 'Join Party'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
