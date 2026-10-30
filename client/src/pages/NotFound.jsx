import React from 'react';
import { Link } from 'react-router-dom';
import { Tv, Home } from 'lucide-react';

export function NotFound() {
  return (
    <div className="theme-page min-h-screen flex flex-col items-center justify-center p-4 text-center transition-colors duration-200">
      <div className="w-16 h-16 rounded-2xl theme-card border theme-border shadow-sm flex items-center justify-center mb-6">
        <Tv className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h1 className="text-4xl font-extrabold theme-text-main mb-2">404 — Page Not Found</h1>
      <p className="text-[var(--text-muted)] text-sm max-w-sm mb-6">
        The watch room or page you are looking for doesn't exist or has expired.
      </p>
      <Link
        to="/"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-transform active:scale-95"
      >
        <Home size={16} />
        <span>Return to Home</span>
      </Link>
    </div>
  );
}
