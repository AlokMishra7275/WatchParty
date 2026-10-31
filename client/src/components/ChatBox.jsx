import React, { useState, useRef, useEffect } from 'react';
import { Send, AlertCircle, Loader2, Smile } from 'lucide-react';
import { formatClockTime } from '../utils/formatters';
import { RoleBadge } from './RoleBadge';
import { EmojiPicker } from './EmojiPicker';

export function ChatBox({ messages = [], currentUserId, onSendMessage }) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatError, setChatError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const emojiButtonRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setChatError('');

    try {
      const res = await onSendMessage(trimmed);
      if (res && res.success === false) {
        setChatError(res.error || 'Failed to send message. Please try again.');
      } else {
        setText('');
        setShowEmojiPicker(false);
      }
    } catch (err) {
      setChatError(err.message || 'Error delivering message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInsertEmoji = (emojiChar) => {
    const input = inputRef.current;
    if (!input) {
      setText((prev) => prev + emojiChar);
      setChatError('');
      return;
    }

    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    const newText = text.slice(0, start) + emojiChar + text.slice(end);
    setText(newText);
    setChatError('');

    // Maintain focus and update cursor position right after the inserted emoji
    requestAnimationFrame(() => {
      input.focus();
      const newPos = start + emojiChar.length;
      input.setSelectionRange(newPos, newPos);
    });
  };

  return (
    <div className="flex flex-col h-full transition-colors duration-200">
      {/* Header */}
      <div className="p-4 border-b theme-border flex items-center justify-between">
        <h3 className="font-bold text-sm theme-text-main">Room Chat</h3>
        <span className="text-[11px] text-[var(--text-muted)]">Only visible to members</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-xs text-[var(--text-muted)]">
              No messages yet. Say hi to start the conversation! 🍿
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px]">
                  <span className="font-semibold theme-text-main">{msg.senderName}</span>
                  <RoleBadge role={msg.senderRole} size="sm" />
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {formatClockTime(msg.timestamp)}
                  </span>
                </div>

                <div
                  className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] break-words shadow-sm leading-relaxed ${
                    isSelf
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-[var(--bg-card-subtle)] text-[var(--text-main)] rounded-tl-none border theme-border'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emojis Bar + Open Full Picker shortcut */}
      <div className="px-3 pt-2 pb-1 border-t theme-border flex items-center justify-between bg-[var(--bg-card-subtle)]">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {['🍿', '🔥', '😂', '👏', '❤️', '😱', '🎉', '👀'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleInsertEmoji(emoji)}
              className="px-2 py-1 text-sm rounded-lg hover:bg-[var(--bg-card-hover)] transition-transform hover:scale-110 active:scale-95 cursor-pointer disabled:opacity-50"
              title={`Add ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border theme-border transition-colors cursor-pointer flex-shrink-0 ${
            showEmojiPicker
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
          }`}
          title="Open Emoji Picker"
        >
          <Smile size={13} />
          <span className="hidden sm:inline">Emojis</span>
        </button>
      </div>

      {/* Chat Error Alert */}
      {chatError && (
        <div className="px-3 py-2 bg-red-50 dark:bg-red-950/60 border-t border-red-200 dark:border-red-900/50 flex items-center gap-2 text-xs text-red-600 dark:text-red-300">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span className="flex-1">{chatError}</span>
          <button
            type="button"
            onClick={() => setChatError('')}
            className="text-red-400 hover:text-red-600 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input Box with Embedded Emoji Picker Button */}
      <form onSubmit={handleSubmit} className="p-3 border-t theme-border bg-[var(--bg-card-subtle)] relative">
        {/* Floating Emoji Picker */}
        <EmojiPicker
          isOpen={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onSelectEmoji={handleInsertEmoji}
          triggerRef={emojiButtonRef}
        />

        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (chatError) setChatError('');
            }}
            placeholder={isSubmitting ? 'Sending...' : 'Send a message with emojis...'}
            maxLength={500}
            disabled={isSubmitting}
            className="theme-input w-full pl-3.5 pr-20 py-2.5 rounded-xl border text-sm placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm disabled:opacity-60"
          />

          <div className="absolute right-1.5 flex items-center gap-1">
            {/* Emoji Trigger Button */}
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                showEmojiPicker
                  ? 'text-indigo-600 dark:text-indigo-400 bg-[var(--bg-card-hover)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
              }`}
              title="Add Emoji"
            >
              <Smile size={17} />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!text.trim() || isSubmitting}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 disabled:hover:bg-indigo-600 transition-all cursor-pointer shadow-sm"
              title="Send Message"
            >
              {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
