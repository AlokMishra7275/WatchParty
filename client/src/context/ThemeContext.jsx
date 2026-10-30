import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export const THEME_STORAGE_KEY = 'watchparty_theme';

/**
 * Resolves the initial theme.
 * Always defaults to 'light' on first visit or when no preference is saved.
 * If user has explicitly selected 'dark', restores 'dark'.
 */
export function resolveInitialTheme(storedTheme) {
  if (storedTheme === 'dark') {
    return 'dark';
  }
  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return resolveInitialTheme(stored);
    } catch {
      return 'light';
    }
  });

  const applyTheme = useCallback((newTheme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const mode = newTheme === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', mode);
    if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, []);

  const setTheme = useCallback((newTheme) => {
    const mode = newTheme === 'dark' ? 'dark' : 'light';
    setThemeState(mode);
    applyTheme(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Could not save theme to localStorage:', e);
    }
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const nextMode = prev === 'dark' ? 'light' : 'dark';
      applyTheme(nextMode);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextMode);
      } catch (e) {
        console.warn('Could not save theme to localStorage:', e);
      }
      return nextMode;
    });
  }, [applyTheme]);

  // Synchronize on mount and ensure root class matches current theme
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
