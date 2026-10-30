import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle({ className = '', size = 'md' }) {
  const { isDark, toggleTheme } = useTheme();

  const isSmall = size === 'sm';
  const iconSize = isSmall ? 15 : 17;
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`relative inline-flex items-center justify-center rounded-xl p-2 transition-all duration-200 cursor-pointer theme-card border hover:border-indigo-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:ring-offset-2 focus:ring-offset-transparent ${className}`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {isDark ? (
          <Moon
            size={iconSize}
            className="transition-transform duration-300 hover:-rotate-12 text-indigo-400"
          />
        ) : (
          <Sun
            size={iconSize}
            className="transition-transform duration-300 hover:rotate-45 text-amber-500"
          />
        )}
      </div>
      <span className="sr-only">{label}</span>
    </button>
  );
}
