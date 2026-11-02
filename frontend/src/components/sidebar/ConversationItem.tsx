import React, { useState } from 'react';
import { MessageSquare, MoreHorizontal, Edit2, Trash2, Check, X, Pin, Archive } from 'lucide-react';
import type { Conversation } from '../../types';
import { useChatStore } from '../../stores/chatStore';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  isPinned?: boolean;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  isPinned = false,
}) => {
  const {
    selectConversation,
    renameConversation,
    deleteConversation,
    togglePinConversation,
    archiveConversation,
  } = useChatStore();
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(conversation.title);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSaveRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (newTitle.trim() && newTitle !== conversation.title) {
      renameConversation(conversation.id, newTitle.trim());
    }
    setIsEditing(false);
    setMenuOpen(false);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNewTitle(conversation.title);
    setIsEditing(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation(conversation.id);
    setMenuOpen(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#ececec] dark:bg-[#2b2b2b]">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent text-xs text-[#0d0d0d] dark:text-[#ececec] focus:outline-none"
          autoFocus
        />
        <button onClick={handleSaveRename} className="p-1 hover:text-emerald-500">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleCancelRename} className="p-1 hover:text-red-500">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => selectConversation(conversation.id)}
      className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-medium transition-colors ${
        isActive
          ? 'bg-[#ececec] dark:bg-[#212121] text-[#0d0d0d] dark:text-white font-semibold'
          : 'text-[#444] dark:text-[#b4b4b4] hover:bg-[#f0f0f0] dark:hover:bg-[#212121]/60'
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2 min-w-0">
        <MessageSquare className="w-4 h-4 flex-shrink-0 text-[#8e8ea0]" />
        <span className="truncate">{conversation.title || 'New Chat'}</span>
      </div>

      <div className="relative flex items-center gap-1.5 flex-shrink-0">
        {isPinned && (
          <Pin className="w-3.5 h-3.5 text-black dark:text-white fill-black dark:fill-white flex-shrink-0" />
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className={`p-1 rounded-md hover:bg-[#d8d8d8] dark:hover:bg-[#333] transition-opacity ${
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 hidden group-hover:block'
          }`}
          title="Options"
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-[#8e8ea0]" />
        </button>

        {menuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 mt-1 w-36 rounded-xl bg-white dark:bg-[#252525] border border-[#e5e5e5] dark:border-[#383838] shadow-xl py-1 z-50 text-xs"
          >
            {/* Pin / Unpin */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePinConversation(conversation.id);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#f4f4f4] dark:hover:bg-[#333] text-[#444] dark:text-[#ccc]"
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'text-black dark:text-white fill-black dark:fill-white' : ''}`} />
              <span>{isPinned ? 'Unpin' : 'Pin chat'}</span>
            </button>

            {/* Archive */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                archiveConversation(conversation.id);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#f4f4f4] dark:hover:bg-[#333] text-[#444] dark:text-[#ccc]"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
            </button>

            {/* Rename */}
            <button
              onClick={() => {
                setIsEditing(true);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#f4f4f4] dark:hover:bg-[#333] text-[#444] dark:text-[#ccc]"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Rename</span>
            </button>

            {/* Delete */}
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
