import React from 'react';
import { Sparkles, Lock } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';

export const ModelSelector: React.FC = () => {
  const { selectedModel } = useChatStore();

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100/80 dark:bg-[#2c2c2c]/80 border border-neutral-200 dark:border-[#383838] select-none text-sm font-semibold text-black dark:text-white cursor-default">
      <span className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-black dark:text-white" />
        <span>CiesGPT AI</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-[#1f1f1f] text-neutral-700 dark:text-neutral-300 font-mono font-medium border border-neutral-200 dark:border-[#333333]">
          {selectedModel || 'cies-llm-v1'}
        </span>
      </span>
      <span title="CiesGPT Webchat AI" className="flex items-center">
        <Lock className="w-3 h-3 text-neutral-400 dark:text-neutral-500 opacity-70" />
      </span>
    </div>
  );
};
