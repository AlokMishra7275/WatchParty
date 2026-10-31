import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Clock,
  Smile,
  Users,
  Heart,
  Flame,
  Dog,
  Pizza,
  Trophy,
  Plane,
  Lightbulb,
  Hash,
  Film,
} from 'lucide-react';
import { EMOJI_CATEGORIES, EMOJIS_BY_CATEGORY } from '../data/emojiData';

const RECENT_STORAGE_KEY = 'watchparty_recent_emojis';
const MAX_RECENT = 24;

const CATEGORY_ICONS = {
  recent: Clock,
  smileys: Smile,
  people: Users,
  hearts: Heart,
  reactions: Flame,
  animals: Dog,
  food: Pizza,
  activities: Trophy,
  travel: Plane,
  objects: Lightbulb,
  symbols: Hash,
  watchparty: Film,
};

export function EmojiPicker({ isOpen, onClose, onSelectEmoji, triggerRef }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [recentEmojis, setRecentEmojis] = useState(() => {
    try {
      const saved = localStorage.getItem(RECENT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [hoveredEmoji, setHoveredEmoji] = useState(null);

  const pickerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target) &&
        (!triggerRef?.current || !triggerRef.current.contains(e.target))
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus search input
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose, triggerRef]);

  // Handle selecting an emoji
  const handleEmojiClick = (emojiObj) => {
    onSelectEmoji(emojiObj.emoji);

    // Update recently used in localStorage
    setRecentEmojis((prev) => {
      const filtered = prev.filter((item) => item.emoji !== emojiObj.emoji);
      const updated = [emojiObj, ...filtered].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save recent emojis', err);
      }
      return updated;
    });
  };

  // Search filter across all emojis
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const results = [];
    const seen = new Set();

    Object.values(EMOJIS_BY_CATEGORY).forEach((list) => {
      list.forEach((item) => {
        if (!seen.has(item.emoji)) {
          if (
            item.name.toLowerCase().includes(q) ||
            item.keywords.toLowerCase().includes(q)
          ) {
            seen.add(item.emoji);
            results.push(item);
          }
        }
      });
    });

    return results;
  }, [searchQuery]);

  // Current category emojis to display
  const currentCategoryEmojis = useMemo(() => {
    if (activeCategory === 'recent') {
      return recentEmojis;
    }
    return EMOJIS_BY_CATEGORY[activeCategory] || [];
  }, [activeCategory, recentEmojis]);

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full right-0 mb-2 w-80 sm:w-96 max-w-[calc(100vw-24px)] rounded-2xl theme-card border theme-border shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-150 transition-colors"
      style={{ maxHeight: '420px' }}
      role="dialog"
      aria-label="Emoji Picker"
    >
      {/* Header & Search */}
      <div className="p-3 border-b theme-border flex flex-col gap-2 bg-[var(--bg-card-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold theme-text-main">
            <Smile size={15} className="text-indigo-600 dark:text-indigo-400" />
            <span>Select Emoji</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
            title="Close emoji picker"
          >
            <X size={15} />
          </button>
        </div>

        {/* Search Field */}
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-2.5 text-[var(--text-muted)] pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emojis (e.g. smile, fire, pop)..."
            className="theme-input w-full pl-8 pr-7 py-1.5 rounded-xl border text-xs placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 p-0.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Category Navigation Bar */}
      {!searchQuery && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b theme-border overflow-x-auto bg-[var(--bg-surface)] no-scrollbar">
          {recentEmojis.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveCategory('recent')}
              className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer flex-shrink-0 ${
                activeCategory === 'recent'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
              }`}
              title="Recently Used"
            >
              <Clock size={15} />
            </button>
          )}

          {EMOJI_CATEGORIES.filter((c) => c.id !== 'recent').map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id] || Smile;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer flex-shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
                }`}
                title={cat.name}
              >
                <Icon size={15} />
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Scrollable Grid */}
      <div className="flex-1 overflow-y-auto p-3 min-h-[220px] max-h-[260px]">
        {searchQuery ? (
          // Search Results View
          <div>
            <div className="text-[11px] font-bold text-[var(--text-muted)] mb-2 px-1">
              Search Results ({searchResults?.length || 0})
            </div>
            {searchResults && searchResults.length > 0 ? (
              <div className="grid grid-cols-8 sm:grid-cols-8 gap-1.5">
                {searchResults.map((item) => (
                  <button
                    key={`${item.emoji}-${item.name}`}
                    type="button"
                    onClick={() => handleEmojiClick(item)}
                    onMouseEnter={() => setHoveredEmoji(item)}
                    onMouseLeave={() => setHoveredEmoji(null)}
                    className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-[var(--bg-card-hover)] hover:scale-125 transition-transform active:scale-95 cursor-pointer select-none"
                    title={item.name}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-[var(--text-muted)]">
                No matching emojis found for &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        ) : (
          // Category Grid View
          <div>
            <div className="text-[11px] font-bold text-[var(--text-muted)] mb-2 px-1">
              {EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.name || 'Emojis'}
            </div>

            {currentCategoryEmojis.length > 0 ? (
              <div className="grid grid-cols-8 sm:grid-cols-8 gap-1.5">
                {currentCategoryEmojis.map((item) => (
                  <button
                    key={`${item.emoji}-${item.name}`}
                    type="button"
                    onClick={() => handleEmojiClick(item)}
                    onMouseEnter={() => setHoveredEmoji(item)}
                    onMouseLeave={() => setHoveredEmoji(null)}
                    className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-[var(--bg-card-hover)] hover:scale-125 transition-transform active:scale-95 cursor-pointer select-none"
                    title={item.name}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-[var(--text-muted)]">
                {activeCategory === 'recent' ? 'No recently used emojis yet.' : 'No emojis available.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Status Bar with Hover Preview */}
      <div className="px-3 py-1.5 border-t theme-border bg-[var(--bg-surface)] flex items-center justify-between text-xs text-[var(--text-muted)] h-9">
        {hoveredEmoji ? (
          <div className="flex items-center gap-2 truncate">
            <span className="text-base leading-none">{hoveredEmoji.emoji}</span>
            <span className="truncate font-medium theme-text-main text-[11px]">
              {hoveredEmoji.name}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-[var(--text-muted)]">
            {searchQuery ? 'Click an emoji to insert' : 'Select an emoji to add to chat'}
          </span>
        )}
        <span className="text-[10px] text-[var(--text-faint)] hidden sm:inline">ESC to close</span>
      </div>
    </div>
  );
}

