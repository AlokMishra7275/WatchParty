import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tv, Sparkles } from 'lucide-react';
import { checkServerHealth } from '../services/api';
import { ThemeToggle } from './ThemeToggle';

export function Navbar({ onOpenCreateModal, onOpenJoinModal }) {
  const location = useLocation();
  const [serverOk, setServerOk] = useState(null);

  useEffect(() => {
    checkServerHealth().then((res) => {
      setServerOk(res.status === 'ok');
    });
  }, []);

  const isHome = location.pathname === '/';

  return (
    <header className="theme-nav sticky top-0 z-40 w-full border-b theme-border backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
            <div className="w-full h-full bg-[var(--bg-card)] rounded-[10px] flex items-center justify-center transition-colors">
              <Tv className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-200" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight theme-text-main">
              WatchParty
            </span>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase -mt-1">
              Sync Playback
            </span>
          </div>
        </Link>

        {/* Navigation Links (Desktop) */}
        {isHome && (
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-muted)]">
            <a href="#features" className="hover:text-[var(--text-main)] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[var(--text-main)] transition-colors">
              How it Works
            </a>
            <a href="#roles" className="hover:text-[var(--text-main)] transition-colors">
              Roles &amp; Approvals
            </a>
          </nav>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Server Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border theme-border bg-[var(--bg-card-subtle)] text-[var(--text-muted)]">
            <span
              className={`w-2 h-2 rounded-full ${
                serverOk === true
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500 animate-pulse'
                  : serverOk === false
                  ? 'bg-red-500'
                  : 'bg-amber-500'
              }`}
            />
            <span>{serverOk ? 'Server Online' : 'Connecting...'}</span>
          </div>

          {onOpenJoinModal && (
            <button
              onClick={onOpenJoinModal}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] theme-text-main border theme-border transition-all cursor-pointer shadow-sm"
            >
              Join Room
            </button>
          )}

          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Create Room</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
