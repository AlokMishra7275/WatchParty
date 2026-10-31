export const THEME_STORAGE_KEY = 'watchparty_theme';

/**
 * Resolves the initial theme.
 * Defaults to 'light' on first visit or when no preference is saved.
 * If user has explicitly selected 'dark', restores 'dark'.
 */
export function resolveInitialTheme(storedTheme) {
  if (storedTheme === 'dark') {
    return 'dark';
  }
  return 'light';
}

