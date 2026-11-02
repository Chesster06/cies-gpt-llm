import React, { useState, useEffect } from 'react';
import { Search, X, MessageSquare, Loader2 } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { api } from '../../services/api';
import type { Conversation } from '../../types';

export const SearchModal: React.FC = () => {
  const { searchOpen, setSearchOpen, selectConversation } = useChatStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSearchOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchConversations(query.trim());
        setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#252525] border border-[#e5e5e5] dark:border-[#383838] shadow-2xl overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b border-[#e5e5e5] dark:border-[#383838]">
          <Search className="w-5 h-5 text-[#8e8ea0] mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-sm text-[#0d0d0d] dark:text-[#ececec] placeholder-[#8e8ea0] focus:outline-none"
            autoFocus
          />
          {loading && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin mr-2" />}
          <button
            onClick={() => setSearchOpen(false)}
            className="p-1 text-[#8e8ea0] hover:text-[#0d0d0d] dark:hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    selectConversation(c.id);
                    setSearchOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#f4f4f4] dark:hover:bg-[#303030] text-left transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-[#8e8ea0]" />
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-medium text-[#0d0d0d] dark:text-[#ececec] truncate">
                      {c.title}
                    </div>
                    <div className="text-xs text-[#8e8ea0]">
                      {c.provider} • {c.model}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="py-8 text-center text-xs text-[#8e8ea0]">
              {loading ? 'Searching...' : 'No matching conversations found.'}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#8e8ea0]">
              Type keywords to search conversation titles and message contents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
