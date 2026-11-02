import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Settings,
  LogOut,
  Moon,
  Sun,
  PanelLeftClose,
  User as UserIcon,
  ChevronRight,
} from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useLanguageStore } from '../../stores/languageStore';
import { ConversationItem } from '../sidebar/ConversationItem';
import { api } from '../../services/api';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const {
    conversations,
    currentConversation,
    newChat,
    sidebarOpen,
    toggleSidebar,
    setSearchOpen,
    pinnedConversationIds,
    archivedConversationIds,
  } = useChatStore();

  const archivedSet = new Set(archivedConversationIds || []);
  const activeConversations = (conversations || []).filter((c) => !archivedSet.has(c.id));
  const pinnedSet = new Set(pinnedConversationIds || []);
  const pinnedConversations = activeConversations.filter((c) => pinnedSet.has(c.id));
  const recentConversations = activeConversations.filter((c) => !pinnedSet.has(c.id));

  const { user, logout, isAuthenticated } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { t, language } = useLanguageStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else setTheme('dark');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  const displayName = user?.name || 'Chesster';
  const getInitials = (name: string) => {
    if (!name) return 'CH';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };
  const initials = getInitials(displayName);

  return (
    <>
      {/* Mobile Backdrop with smooth fade */}
      <div
        onClick={toggleSidebar}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden transition-opacity duration-300 ease-in-out ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sidebar Container with smooth slide animation for open and close */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 w-64 flex-shrink-0 flex flex-col bg-[#f7f7f7] dark:bg-[#0f0f0f] border-r border-neutral-200 dark:border-neutral-800 transition-[margin,transform] duration-300 ease-in-out ${
          sidebarOpen
            ? 'translate-x-0 md:ml-0'
            : '-translate-x-full md:translate-x-0 md:-ml-64'
        }`}
      >
        {/* Header Branding */}
        <div className="flex items-center justify-between p-3.5 pb-2">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="CiesGPT Logo"
              className="w-8 h-8 rounded-lg object-contain bg-black dark:bg-black p-0.5 border border-neutral-300 dark:border-neutral-800"
            />
            <span className="font-extrabold text-base tracking-tight text-black dark:text-white">
              CiesGPT
            </span>
          </div>

          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="px-3 py-2 space-y-1.5">
          <button
            onClick={newChat}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 hover:border-black dark:hover:border-white text-black dark:text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>{t.newChat}</span>
            </span>
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-xs font-medium transition-colors"
          >
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span>{t.search}</span>
            </span>
            <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {/* Pinned Section */}
          {pinnedConversations.length > 0 && (
            <div className="mb-2 space-y-0.5">
              <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                {language === 'ms' ? 'Disematkan' : 'Pinned'}
              </div>
              {pinnedConversations.map((c) => (
                <ConversationItem
                  key={c.id}
                  conversation={c}
                  isActive={currentConversation?.id === c.id}
                  isPinned={true}
                />
              ))}
            </div>
          )}

          {/* Recent Section */}
          <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            {t.recent}
          </div>

          {recentConversations.length > 0 ? (
            recentConversations.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                isActive={currentConversation?.id === c.id}
                isPinned={false}
              />
            ))
          ) : pinnedConversations.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-neutral-400 dark:text-neutral-600">
              {t.recent}
            </div>
          ) : null}
        </div>

        {/* Footer User Area */}
        <div className="relative p-2 border-t border-neutral-200 dark:border-neutral-800">
          {!isAuthenticated || !user || user.name === 'Guest' ? (
            <div className="p-3 my-1 rounded-2xl bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-[#2e2e2e] shadow-xs text-left">
              <div className="font-bold text-xs text-black dark:text-white leading-snug">
                {language === 'ms' ? 'Dapatkan jawapan khusus untuk anda' : 'Get responses tailored to you'}
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-normal">
                {language === 'ms'
                  ? 'Log masuk untuk melihat sejarah sembang dan akses semua model AI.'
                  : 'Log in to get answers based on saved chats, plus access all AI models.'}
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full mt-3 py-2 rounded-xl bg-black dark:bg-[#2e2e2e] hover:opacity-90 dark:hover:bg-[#383838] text-white font-semibold text-xs transition-colors shadow-xs"
              >
                {t.logIn}
              </button>
            </div>
          ) : (
            <>
              {/* User Popover Menu */}
              {userMenuOpen && (
                <div
                  ref={userMenuRef}
                  className="absolute bottom-full mb-2 left-2 right-2 z-50 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-2xl p-1.5 text-black dark:text-white"
                >
                  {/* Profile Header Item */}
                  <div
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#eab308] text-black font-bold flex items-center justify-center text-xs flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex flex-col min-w-0 text-left">
                        <span className="font-semibold text-xs text-black dark:text-white truncate">
                          {displayName}
                        </span>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                          {t.freePlan}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </div>

                  <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-1" />

                  {/* Personalization (toggles theme) */}
                  <button
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      {theme === 'dark' ? (
                        <Moon className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                      ) : (
                        <Sun className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                      )}
                      <span>{t.personalization}</span>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      {theme === 'dark' ? t.dark : t.light}
                    </span>
                  </button>

                  {/* Profile */}
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors text-left"
                  >
                    <UserIcon className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                    <span>{t.profile}</span>
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors text-left"
                  >
                    <Settings className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                    <span>{t.settings}</span>
                  </button>

                  <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-1" />

                  {/* Log out */}
                  <button
                    onClick={async () => {
                      setUserMenuOpen(false);
                      try {
                        await api.logout();
                      } catch {
                        // ignore network error
                      }
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                    <span>{t.logOut}</span>
                  </button>
                </div>
              )}

              {/* Bottom User Pill Card */}
              <div
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center justify-between p-1.5 rounded-2xl bg-neutral-200/50 dark:bg-[#181818] border border-neutral-300/40 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-[#202020] transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#eab308] text-black font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs">
                    {initials}
                  </div>
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="font-semibold text-xs text-black dark:text-white truncate leading-tight">
                      {displayName}
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                      {t.freePlan}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 mr-1" />
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
};
