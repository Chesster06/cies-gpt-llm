import React from 'react';
import { PanelLeft, Plus } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';

export const Header: React.FC = () => {
  const { sidebarOpen, toggleSidebar, newChat } = useChatStore();

  return (
    <header className="h-12 flex items-center justify-between px-3 border-b border-neutral-200 dark:border-[#2e2e2e] bg-white/95 dark:bg-[#212121]/95 backdrop-blur-md sticky top-0 z-30 select-none">
      <div className="flex items-center gap-2">
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#2c2c2c] transition-all animate-in fade-in duration-300"
            title="Open sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      <button
        onClick={newChat}
        className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#2c2c2c] transition-colors"
        title="New chat"
      >
        <Plus className="w-4 h-4" />
      </button>
    </header>
  );
};
