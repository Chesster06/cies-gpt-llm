import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Square, Globe } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useLanguageStore } from '../../stores/languageStore';

export const MessageComposer: React.FC = () => {
  const {
    sendMessage,
    isStreaming,
    stopGenerating,
    webSearchEnabled,
    toggleWebSearch,
  } = useChatStore();
  const { t, language } = useLanguageStore();
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && isStreaming) {
      e.preventDefault();
      stopGenerating();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isStreaming) {
      stopGenerating();
      return;
    }
    if (!input.trim()) return;

    sendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-[#212121] dark:via-[#212121]/90 dark:to-transparent pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <div className="relative rounded-3xl bg-neutral-100 dark:bg-[#2f2f2f] border border-neutral-300 dark:border-[#3d3d3d] shadow-lg p-2 focus-within:border-black dark:focus-within:border-neutral-400 transition-all duration-200">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={language === 'ms' ? 'Mesej CiesGPT...' : 'Message CiesGPT...'}
            className="w-full pl-4 pr-12 py-2 bg-transparent text-black dark:text-white text-sm sm:text-base placeholder-neutral-500 focus:outline-none resize-none leading-relaxed max-h-48"
          />

          <div className="flex items-center justify-between px-2 pt-1 pb-0.5 text-xs text-neutral-500">
            <button
              type="button"
              onClick={toggleWebSearch}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                webSearchEnabled
                  ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                  : 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700'
              }`}
              title={
                webSearchEnabled
                  ? (language === 'ms' ? 'Carian Web Internet Aktif (Klik untuk matikan)' : 'Web Search Active (Click to disable)')
                  : (language === 'ms' ? 'Aktifkan Carian Web Terkini' : 'Enable Live Web Search')
              }
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t.webSearch}</span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={!input.trim() && !isStreaming}
              className={`p-2 rounded-full transition-all duration-150 flex items-center justify-center ${
                isStreaming
                  ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80'
                  : input.trim()
                  ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-85 shadow-sm'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
              }`}
              title={isStreaming ? t.stopGenerating : (language === 'ms' ? 'Hantar mesej (Enter)' : 'Send message (Enter)')}
            >
              {isStreaming ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>

        <div className="text-center mt-2 text-[11px] text-neutral-500 dark:text-neutral-400 select-none">
          {language === 'ms'
            ? 'CiesGPT boleh melakukan kesilapan. Sila semak maklumat penting.'
            : 'CiesGPT can make mistakes. Check important info.'}
        </div>
      </div>
    </div>
  );
};
