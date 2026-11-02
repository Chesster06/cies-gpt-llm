import React, { useEffect } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { MessageList } from '../components/chat/MessageList';
import { MessageComposer } from '../components/chat/MessageComposer';
import { SearchModal } from '../components/sidebar/SearchModal';
import { useChatStore } from '../stores/chatStore';

export const ChatPage: React.FC = () => {
  const { loadProviders, loadConversations } = useChatStore();

  useEffect(() => {
    loadProviders();
    loadConversations();
  }, [loadProviders, loadConversations]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#212121]">
      <Sidebar />

      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        <Header />
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <MessageList />
          <MessageComposer />
        </div>
      </main>

      <SearchModal />
    </div>
  );
};
