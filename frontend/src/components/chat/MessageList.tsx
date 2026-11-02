import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { MessageItem } from './MessageItem';
import { WelcomeScreen } from './WelcomeScreen';

export const MessageList: React.FC = () => {
  const { messages, currentConversation } = useChatStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);
  const prevMessagesCountRef = useRef<number>(messages.length);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom < 80;

    shouldAutoScrollRef.current = isAtBottom;
    setShowScrollBottom(!isAtBottom && scrollHeight > clientHeight + 100);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior,
      });
      shouldAutoScrollRef.current = true;
      setShowScrollBottom(false);
    }
  };

  useEffect(() => {
    // If a brand new user message was sent, always snap to bottom
    const lastMsg = messages[messages.length - 1];
    if (messages.length > prevMessagesCountRef.current && lastMsg?.role === 'user') {
      shouldAutoScrollRef.current = true;
      scrollToBottom('smooth');
    } else if (shouldAutoScrollRef.current) {
      // Auto scroll if user hasn't scrolled up
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages]);

  if (messages.length === 0 && !currentConversation) {
    return <WelcomeScreen />;
  }

  // Find last assistant message index
  let lastAssistantIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      lastAssistantIndex = i;
      break;
    }
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto pb-36 relative scroll-smooth"
    >
      {messages.map((message, index) => (
        <MessageItem
          key={message.id || index}
          message={message}
          isLastAssistant={index === lastAssistantIndex}
        />
      ))}

      {/* Floating Scroll to Bottom Button if user scrolled up */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="fixed bottom-28 right-6 z-30 p-2.5 rounded-full bg-white dark:bg-[#2c2c2c] border border-neutral-300 dark:border-neutral-700 shadow-md text-neutral-600 dark:text-neutral-200 hover:text-black dark:hover:text-white transition-all animate-in fade-in zoom-in-95 duration-200 cursor-pointer"
          title="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
