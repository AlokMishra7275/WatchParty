import React from 'react';
import { Tv } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t theme-border bg-[var(--bg-page)] py-10 mt-auto transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-card-subtle)] border theme-border flex items-center justify-center">
            <Tv className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="font-bold text-sm theme-text-main">WatchParty</p>
            <p className="text-xs text-[var(--text-muted)]">Real-Time YouTube Sync &amp; Room Moderation</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            Built with React, Express &amp; Socket.IO
          </span>
          <span>•</span>
          <span className="text-[var(--text-faint)]">Production Ready MVP</span>
        </div>

        <div className="text-xs text-[var(--text-faint)] flex items-center gap-1">
          <span>Crafted for Full Stack Development Internship</span>
        </div>
      </div>
    </footer>
  );
}
