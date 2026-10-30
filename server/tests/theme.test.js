/**
 * @file theme.test.js
 * Unit tests for Theme resolution, storage keys, and toggling logic
 * Validates that Light Mode is the default on first visit / unsaved state,
 * and saved preferences ('dark' / 'light') are restored on return visits.
 */

const THEME_STORAGE_KEY = 'watchparty_theme';

function resolveInitialTheme(storedTheme) {
  if (storedTheme === 'dark') {
    return 'dark';
  }
  return 'light';
}

function toggleTheme(currentTheme) {
  return currentTheme === 'dark' ? 'light' : 'dark';
}

function applyThemeToRoot(rootElement, theme) {
  const mode = theme === 'dark' ? 'dark' : 'light';
  rootElement.setAttribute('data-theme', mode);
  if (mode === 'dark') {
    rootElement.classList.add('dark');
    rootElement.classList.remove('light');
  } else {
    rootElement.classList.remove('dark');
    rootElement.classList.add('light');
  }
  return mode;
}

describe('Theme Resolution & Persistence Logic (Default Light Mode)', () => {
  test('uses the standard storage key watchparty_theme', () => {
    expect(THEME_STORAGE_KEY).toBe('watchparty_theme');
  });

  test('defaults to Light Mode on first visit when no preference is saved (null/undefined)', () => {
    expect(resolveInitialTheme(null)).toBe('light');
    expect(resolveInitialTheme(undefined)).toBe('light');
  });

  test('restores saved "dark" theme when previously chosen by user', () => {
    expect(resolveInitialTheme('dark')).toBe('dark');
  });

  test('restores saved "light" theme when explicitly saved', () => {
    expect(resolveInitialTheme('light')).toBe('light');
  });

  test('defaults to Light Mode when encountering unknown or invalid stored theme values', () => {
    expect(resolveInitialTheme('unknown')).toBe('light');
    expect(resolveInitialTheme('')).toBe('light');
    expect(resolveInitialTheme('system')).toBe('light');
  });

  test('correctly toggles from light mode to dark mode and vice versa', () => {
    expect(toggleTheme('light')).toBe('dark');
    expect(toggleTheme('dark')).toBe('light');
  });

  test('applies data-theme="dark" and adds .dark class to root element for dark mode', () => {
    const mockRoot = {
      attributes: {},
      classList: new Set(),
      setAttribute(k, v) { this.attributes[k] = v; },
      getAttribute(k) { return this.attributes[k]; }
    };
    mockRoot.classList.add = function(c) { this.has(c) || Set.prototype.add.call(this, c); };
    mockRoot.classList.remove = function(c) { Set.prototype.delete.call(this, c); };

    applyThemeToRoot(mockRoot, 'dark');
    expect(mockRoot.getAttribute('data-theme')).toBe('dark');
    expect(mockRoot.classList.has('dark')).toBe(true);
    expect(mockRoot.classList.has('light')).toBe(false);
  });

  test('applies data-theme="light" and removes .dark class from root element for light mode', () => {
    const mockRoot = {
      attributes: { 'data-theme': 'dark' },
      classList: new Set(['dark']),
      setAttribute(k, v) { this.attributes[k] = v; },
      getAttribute(k) { return this.attributes[k]; }
    };
    mockRoot.classList.add = function(c) { this.has(c) || Set.prototype.add.call(this, c); };
    mockRoot.classList.remove = function(c) { Set.prototype.delete.call(this, c); };

    applyThemeToRoot(mockRoot, 'light');
    expect(mockRoot.getAttribute('data-theme')).toBe('light');
    expect(mockRoot.classList.has('dark')).toBe(false);
    expect(mockRoot.classList.has('light')).toBe(true);
  });
});
