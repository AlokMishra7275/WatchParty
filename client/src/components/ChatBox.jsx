import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { formatClockTime } from '../utils/formatters';
import { RoleBadge } from './RoleBadge';

export function ChatBox({ messages = [], currentUserId, onSendMessage }) {
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
  };

  const addEmoji = (emoji) => {
    setText((prev) => prev + emoji);
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
                  className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] break-words shadow-sm ${
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

      {/* Quick Emojis */}
      <div className="px-3 pt-2 pb-1 border-t theme-border flex items-center gap-1.5 overflow-x-auto">
        {['🍿', '🔥', '😂', '👏', '❤️', '😱'].map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => addEmoji(emoji)}
            className="px-2 py-1 text-sm rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-3 border-t theme-border bg-[var(--bg-card-subtle)]">
        <div className="relative flex items-center">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Send a message..."
            maxLength={500}
            className="theme-input w-full pl-3 pr-10 py-2.5 rounded-xl border text-sm placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="absolute right-1.5 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 disabled:hover:bg-indigo-600 transition-all cursor-pointer"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
