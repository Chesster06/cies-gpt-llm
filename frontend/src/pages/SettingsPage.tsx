import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Settings as SettingsIcon,
  Sun,
  User as UserIcon,
  Shield as ShieldIcon,
  Edit2,
  Check,
  X,
  ChevronRight,
  Archive,
  ArchiveRestore,
  Trash2,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore, type ColorPreset } from '../stores/themeStore';
import { useChatStore } from '../stores/chatStore';
import { useLanguageStore, type Language } from '../stores/languageStore';
import { api } from '../services/api';

type SettingsTab = 'general' | 'appearance' | 'account' | 'data-controls';

const getThemeHexColors = (effective: 'light' | 'dark', preset: ColorPreset) => {
  if (effective === 'light') {
    return { bg: '#FFFFFF', fg: '#0D0D0D' };
  }
  switch (preset) {
    case 'oled':
      return { bg: '#000000', fg: '#FFFFFF' };
    case 'slate':
      return { bg: '#111827', fg: '#F3F4F6' };
    case 'emerald':
      return { bg: '#022C22', fg: '#A7F3D0' };
    case 'violet':
      return { bg: '#1E1B4B', fg: '#E0E7FF' };
    case 'minimalist':
    default:
      return { bg: '#0F0F0F', fg: '#EDEDED' };
  }
};

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();
  const {
    theme,
    setTheme,
    effectiveTheme,
    colorPreset,
  } = useThemeStore();
  const { language, setLanguage, t } = useLanguageStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [searchQuery, setSearchQuery] = useState('');

  const activeHex = getThemeHexColors(effectiveTheme, colorPreset);

  // Editable account states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [nameValue, setNameValue] = useState(user?.name || '');
  const [usernameValue, setUsernameValue] = useState(
    user?.username || (user?.email ? `@${user.email.split('@')[0]}` : '')
  );
  const emailValue = user?.email || '';

  React.useEffect(() => {
    if (user?.name) setNameValue(user.name);
    if (user?.username) setUsernameValue(user.username);
  }, [user]);

  // General settings state
  const [improveModel, setImproveModel] = useState(true);
  const [archivedModalOpen, setArchivedModalOpen] = useState(false);

  // Location permissions state
  const [locationEnabled, setLocationEnabled] = useState<boolean>(
    () => localStorage.getItem('cies_location_enabled') === 'true'
  );
  const [locationName, setLocationName] = useState<string>(
    () => localStorage.getItem('cies_location_name') || ''
  );

  const {
    conversations,
    archivedConversationIds,
    unarchiveConversation,
    archiveAllConversations,
    deleteConversation,
    selectConversation,
  } = useChatStore();

  const archivedIdsSet = new Set(archivedConversationIds || []);
  const archivedConversations = (conversations || []).filter((c) => archivedIdsSet.has(c.id));

  const showNotification = (_msg?: string) => {
    // Disabled all toast notifications
  };

  const handleToggleLocation = () => {
    if (locationEnabled) {
      setLocationEnabled(false);
      localStorage.setItem('cies_location_enabled', 'false');
      return;
    }

    // Toggle on immediately
    setLocationEnabled(true);
    localStorage.setItem('cies_location_enabled', 'true');

    // Restore cached location if present
    const cachedName = localStorage.getItem('cies_location_name');
    if (cachedName && !locationName) {
      setLocationName(cachedName);
    }

    if (!('geolocation' in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const coordsStr = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        let placeName = coordsStr;

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
            {
              headers: { 'Accept-Language': language === 'ms' ? 'ms,en' : 'en' },
              signal: controller.signal,
            }
          );
          clearTimeout(timer);
          if (res.ok) {
            const data = await res.json();
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.municipality ||
              data.address?.suburb ||
              data.address?.state;
            const country = data.address?.country;
            if (city && country && city !== country) {
              placeName = `${city}, ${country}`;
            } else if (city || country) {
              placeName = city || country;
            }
          }
        } catch {
          // fallback to coordinates or cached name
        }

        setLocationName(placeName);
        localStorage.setItem('cies_location_name', placeName);
        localStorage.setItem(
          'cies_location_coords',
          JSON.stringify({ lat, lon })
        );
      },
      async () => {
        // Fallback: If browser GPS fails and we have no cached name, try IP geolocation
        if (!localStorage.getItem('cies_location_name')) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3000);
            const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
            clearTimeout(timer);
            if (res.ok) {
              const data = await res.json();
              if (data.city && data.country_name) {
                const ipPlace = `${data.city}, ${data.country_name}`;
                setLocationName(ipPlace);
                localStorage.setItem('cies_location_name', ipPlace);
                if (data.latitude && data.longitude) {
                  localStorage.setItem(
                    'cies_location_coords',
                    JSON.stringify({ lat: data.latitude, lon: data.longitude })
                  );
                }
              }
            }
          } catch {
            // Keep enabled
          }
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      }
    );
  };

  const handleSaveField = async (field: string) => {
    if (field === 'name') {
      updateUser({ name: nameValue });
      try {
        await api.updateProfile({ name: nameValue });
      } catch {}
    }
    if (field === 'username') {
      const clean = usernameValue.startsWith('@') ? usernameValue : `@${usernameValue}`;
      setUsernameValue(clean);
      updateUser({ username: clean });
      try {
        await api.updateProfile({ username: clean });
      } catch {}
    }
    setEditingField(null);
  };

  const handleArchiveAllChats = () => {
    const confirmMsg = language === 'ms'
      ? 'Adakah anda pasti mahu mengarkibkan semua sembang aktif?'
      : 'Are you sure you want to archive all active chats?';
    if (window.confirm(confirmMsg)) {
      archiveAllConversations();
      showNotification(language === 'ms' ? 'Semua sembang telah diarkibkan' : 'All active chats archived');
    }
  };

  const handleDeleteAllChats = () => {
    const confirmMsg = language === 'ms' 
      ? 'Adakah anda pasti mahu memadamkan semua sembang secara kekal? Tindakan ini tidak boleh dibatalkan.' 
      : 'Are you sure you want to permanently delete all chats? This cannot be undone.';
    if (window.confirm(confirmMsg)) {
      useChatStore.setState({ conversations: [], currentConversation: null, messages: [] });
      showNotification(language === 'ms' ? 'Semua sejarah sembang telah dipadamkan' : 'All conversation history deleted');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmMsg = language === 'ms'
      ? 'Padam akaun? Akaun anda dan semua sejarah perbualan akan dipadamkan secara kekal dari pangkalan data.'
      : 'Delete account? Your account and all conversation history will be permanently deleted from the database.';
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.deleteAccount();
    } catch (err: any) {
      console.warn('Backend delete account error:', err);
    } finally {
      useChatStore.setState({ conversations: [], currentConversation: null, messages: [] });
      logout();
      navigate('/login');
    }
  };

  const tabs = [
    { id: 'general' as SettingsTab, label: t.general, icon: SettingsIcon },
    { id: 'appearance' as SettingsTab, label: t.appearance, icon: Sun },
    { id: 'account' as SettingsTab, label: t.account, icon: UserIcon },
    { id: 'data-controls' as SettingsTab, label: t.dataControls, icon: ShieldIcon },
  ];

  const filteredTabs = tabs.filter((t) =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#000000] text-neutral-900 dark:text-white flex flex-col md:flex-row font-sans transition-colors duration-200">

      {/* Left Navigation Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-neutral-200 dark:border-[#1e1e1e] p-4 flex flex-col flex-shrink-0 bg-white dark:bg-[#000000] transition-colors duration-200">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors mb-4 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.backToApp}</span>
        </button>

        {/* Search input */}
        <div className="relative mb-6">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
          <input
            type="text"
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-100 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
          />
        </div>

        {/* Section title */}
        <div className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 px-3 mb-2 tracking-wide">
          {t.personal}
        </div>

        {/* Tab list */}
        <nav className="space-y-1">
          {filteredTabs.map((tItem) => {
            const Icon = tItem.icon;
            const isActive = activeTab === tItem.id;
            return (
              <button
                key={tItem.id}
                onClick={() => setActiveTab(tItem.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-neutral-200/90 dark:bg-[#1f1f1f] text-neutral-900 dark:text-white font-semibold shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
                }`}
              >
                <Icon className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                <span>{tItem.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Right Content Panel */}
      <main className="flex-1 min-w-0 p-6 md:p-12 overflow-y-auto flex justify-center">
        <div className="w-full max-w-2xl">
          {/* ---------------- 1. GENERAL TAB ---------------- */}
        {activeTab === 'general' && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-6">{t.generalHeading}</h1>
            <div className="text-xs font-semibold text-neutral-400 mb-3">{t.generalSection}</div>

            <div className="rounded-2xl bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-[#1e1e1e] divide-y divide-neutral-200 dark:divide-[#1e1e1e]">
              {/* Language */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-neutral-900 dark:text-white">{t.language}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{t.languageSubtitle}</div>
                </div>
                <div>
                  <select
                    value={language}
                    onChange={(e) => {
                      const next = e.target.value as Language;
                      setLanguage(next);
                      showNotification(
                        next === 'ms'
                          ? 'Bahasa antara muka ditukar kepada Bahasa Melayu'
                          : 'App UI language set to English'
                      );
                    }}
                    className="bg-neutral-100 dark:bg-[#1f1f1f] border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 text-xs text-neutral-900 dark:text-white rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
                  >
                    <option value="en">English</option>
                    <option value="ms">Bahasa Melayu</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 2. APPEARANCE TAB ---------------- */}
        {activeTab === 'appearance' && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-6">{t.appearanceHeading}</h1>
            <div className="text-xs font-semibold text-neutral-400 mb-3">{t.visualStyle}</div>

            <div className="rounded-2xl bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-[#1e1e1e] p-5 space-y-6">
              {/* Mode Selection Cards */}
              <div>
                <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-3">{t.mode}</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* System */}
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('system');
                      showNotification(language === 'ms' ? 'Mod Sistem diaktifkan' : 'System mode activated');
                    }}
                    className={`p-3 rounded-2xl border transition-all text-left flex flex-col items-center ${
                      theme === 'system'
                        ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-[#1a1a1a] shadow-xs'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#121212] hover:border-neutral-400 dark:hover:border-neutral-700'
                    }`}
                  >
                    <div className="w-full h-14 rounded-lg overflow-hidden flex border border-neutral-300 dark:border-neutral-700 mb-2.5">
                      <div className="w-1/2 bg-white flex flex-col p-1.5 gap-1">
                        <div className="w-8 h-1 bg-neutral-300 rounded" />
                        <div className="w-12 h-1 bg-neutral-300 rounded" />
                      </div>
                      <div className="w-1/2 bg-black flex flex-col p-1.5 gap-1">
                        <div className="w-8 h-1 bg-neutral-700 rounded" />
                        <div className="w-12 h-1 bg-neutral-700 rounded" />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-neutral-900 dark:text-white">{t.system}</span>
                  </button>

                  {/* Light */}
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('light');
                      showNotification(language === 'ms' ? 'Mod Cerah diaktifkan' : 'Light mode activated');
                    }}
                    className={`p-3 rounded-2xl border transition-all text-left flex flex-col items-center ${
                      theme === 'light'
                        ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-[#1a1a1a] shadow-xs ring-1 ring-neutral-400 dark:ring-white'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#121212] hover:border-neutral-400 dark:hover:border-neutral-700'
                    }`}
                  >
                    <div className="w-full h-14 rounded-lg bg-neutral-100 border border-neutral-300 p-2 flex flex-col gap-1.5 mb-2.5">
                      <div className="w-10 h-1.5 bg-neutral-400 rounded" />
                      <div className="w-16 h-1.5 bg-blue-500 rounded" />
                      <div className="w-12 h-1.5 bg-neutral-300 rounded" />
                    </div>
                    <span className="text-xs font-medium text-neutral-900 dark:text-white">{t.light}</span>
                  </button>

                  {/* Dark */}
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('dark');
                      showNotification(language === 'ms' ? 'Mod Gelap diaktifkan' : 'Dark mode activated');
                    }}
                    className={`p-3 rounded-2xl border transition-all text-left flex flex-col items-center ${
                      theme === 'dark'
                        ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-[#1a1a1a] shadow-xs ring-1 ring-neutral-400 dark:ring-white'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#121212] hover:border-neutral-400 dark:hover:border-neutral-700'
                    }`}
                  >
                    <div className="w-full h-14 rounded-lg bg-black border border-neutral-700 p-2 flex flex-col gap-1.5 mb-2.5">
                      <div className="w-10 h-1.5 bg-neutral-600 rounded" />
                      <div className="w-16 h-1.5 bg-blue-400 rounded" />
                      <div className="w-12 h-1.5 bg-neutral-700 rounded" />
                    </div>
                    <span className="text-xs font-medium text-neutral-900 dark:text-white">{t.dark}</span>
                  </button>
                </div>
              </div>

              {/* Theme Details Table */}
              <div className="divide-y divide-neutral-200 dark:divide-[#1e1e1e] pt-2 border-t border-neutral-200 dark:border-[#1e1e1e]">
                {/* Background */}
                <div className="py-3 flex items-center justify-between text-xs">
                  <span className="text-neutral-600 dark:text-neutral-400 font-medium">{t.background}</span>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-700 shadow-xs"
                      style={{ backgroundColor: activeHex.bg }}
                    />
                    <span className="font-mono text-neutral-800 dark:text-neutral-200 text-xs font-semibold">
                      {activeHex.bg}
                    </span>
                  </div>
                </div>

                {/* Foreground */}
                <div className="py-3 flex items-center justify-between text-xs">
                  <span className="text-neutral-600 dark:text-neutral-400 font-medium">{t.foreground}</span>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-700 shadow-xs"
                      style={{ backgroundColor: activeHex.fg }}
                    />
                    <span className="font-mono text-neutral-800 dark:text-neutral-200 text-xs font-semibold">
                      {activeHex.fg}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 3. ACCOUNT TAB (EDIT DETAIL) ---------------- */}
        {activeTab === 'account' && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-6">{t.accountHeading}</h1>
            <div className="text-xs font-semibold text-neutral-400 mb-3">{t.accountDetails}</div>

            <div className="rounded-2xl bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-[#1e1e1e] divide-y divide-neutral-200 dark:divide-[#1e1e1e] mb-6">
              {/* Name */}
              <div className="p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 w-1/3">{t.name}</span>
                <div className="flex-1 flex items-center justify-end gap-2">
                  {editingField === 'name' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        className="bg-neutral-100 dark:bg-[#1a1a1a] border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white rounded-lg px-2.5 py-1 focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveField('name')}
                        className="p-1 rounded bg-black dark:bg-white text-white dark:text-black hover:opacity-85"
                        title={t.save}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingField(null)}
                        className="p-1 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700"
                        title={t.cancel}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs text-neutral-800 dark:text-neutral-300">{user?.name || nameValue}</span>
                      <button
                        onClick={() => setEditingField('name')}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        title="Edit name"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Username */}
              <div className="p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 w-1/3">{t.username}</span>
                <div className="flex-1 flex items-center justify-end gap-2">
                  {editingField === 'username' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={usernameValue}
                        onChange={(e) => setUsernameValue(e.target.value)}
                        className="bg-neutral-100 dark:bg-[#1a1a1a] border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white rounded-lg px-2.5 py-1 focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveField('username')}
                        className="p-1 rounded bg-black dark:bg-white text-white dark:text-black hover:opacity-85"
                        title={t.save}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingField(null)}
                        className="p-1 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700"
                        title={t.cancel}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">{user?.username || usernameValue}</span>
                      <button
                        onClick={() => setEditingField('username')}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        title="Edit username"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Email (Read-only) */}
              <div className="p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 w-1/3">{t.email}</span>
                <div className="flex-1 flex items-center justify-end">
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono select-all">
                    {user?.email || emailValue}
                  </span>
                </div>
              </div>
            </div>

            {/* Delete Account Card */}
            <div className="rounded-2xl bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-[#1e1e1e] p-4 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-300 block">{t.deleteAccount}</span>
                <span className="text-xs text-neutral-500 mt-0.5 block">{t.deleteAccountDesc}</span>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-1.5 rounded-xl bg-red-50 dark:bg-[#2b1212] hover:bg-red-100 dark:hover:bg-[#3d1a1a] text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-xs font-semibold transition-colors flex-shrink-0"
              >
                {t.deleteAccount}
              </button>
            </div>
          </div>
        )}

        {/* ---------------- 4. DATA CONTROLS TAB ---------------- */}
        {activeTab === 'data-controls' && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-6">{t.dataControlsHeading}</h1>

            <div className="rounded-2xl bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-[#1e1e1e] divide-y divide-neutral-200 dark:divide-[#1e1e1e]">

              {/* Improve model for everyone */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-neutral-900 dark:text-neutral-200">
                    {t.improveModel}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {t.improveModelDesc}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImproveModel(!improveModel);
                    showNotification(
                      !improveModel
                        ? (language === 'ms' ? 'Perkongsian data sembang diaktifkan' : 'Chat sharing enabled')
                        : (language === 'ms' ? 'Perkongsian data sembang dimatikan' : 'Chat sharing disabled')
                    );
                  }}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    improveModel ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      improveModel ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Location */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-200">{t.location}</span>
                    {locationEnabled && locationName && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="truncate">{locationName}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                    {t.locationDesc}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleLocation}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors flex-shrink-0 cursor-pointer ${
                    locationEnabled ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-700'
                  }`}
                  title={
                    locationEnabled
                      ? language === 'ms'
                        ? 'Matikan akses lokasi'
                        : 'Turn off location access'
                      : language === 'ms'
                      ? 'Hidupkan akses lokasi'
                      : 'Turn on location access'
                  }
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      locationEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Archived chats */}
              <div
                onClick={() => setArchivedModalOpen(true)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors"
              >
                <div>
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-200 block">{t.archivedChats}</span>
                  <span className="text-xs text-neutral-500 mt-0.5 block">{t.archivedChatsDesc}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                    {archivedConversations.length}
                  </span>
                  <ChevronRight className="w-4 h-4 text-neutral-500" />
                </div>
              </div>

              {/* Archive all chats */}
              <div className="p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-200">{t.archiveAllChats}</span>
                <button
                  onClick={handleArchiveAllChats}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#1f1f1f] border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                >
                  {language === 'ms' ? 'Arkibkan semua' : 'Archive all'}
                </button>
              </div>

              {/* Delete all chats */}
              <div className="p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-200">{t.deleteAllChats}</span>
                <button
                  onClick={handleDeleteAllChats}
                  className="px-3.5 py-1.5 rounded-xl bg-red-50 dark:bg-[#2b1212] hover:bg-red-100 dark:hover:bg-[#3d1a1a] border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors"
                >
                  {language === 'ms' ? 'Padam semua' : 'Delete all'}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* Archived Chats Modal */}
      {archivedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    {t.archivedChats}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                      {archivedConversations.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {t.archivedChatsDesc}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setArchivedModalOpen(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {archivedConversations.length > 0 ? (
                archivedConversations.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                        {c.title || 'New Chat'}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {new Date(c.updated_at || c.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Unarchive Button */}
                      <button
                        onClick={() => {
                          unarchiveConversation(c.id);
                          showNotification(
                            language === 'ms'
                              ? 'Sembang telah dinyaharkib'
                              : 'Chat unarchived'
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1.5"
                        title="Unarchive"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5" />
                        <span>{language === 'ms' ? 'Nyaharkib' : 'Unarchive'}</span>
                      </button>

                      {/* Open Chat Button */}
                      <button
                        onClick={async () => {
                          setArchivedModalOpen(false);
                          await selectConversation(c.id);
                          navigate('/');
                        }}
                        className="p-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                        title="Open chat"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              language === 'ms'
                                ? 'Padam sembang ini secara kekal?'
                                : 'Permanently delete this chat?'
                            )
                          ) {
                            deleteConversation(c.id);
                            showNotification(
                              language === 'ms'
                                ? 'Sembang telah dipadam'
                                : 'Chat deleted'
                            );
                          }
                        }}
                        className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center text-neutral-400 dark:text-neutral-500">
                  <Archive className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-xs font-medium">
                    {language === 'ms' ? 'Tiada sembang diarkibkan' : 'No archived chats'}
                  </p>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-600 mt-0.5">
                    {language === 'ms'
                      ? 'Sembang yang diarkibkan dari bar sisi akan muncul di sini.'
                      : 'Chats you archive from the sidebar options will show up here.'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex justify-end">
              <button
                onClick={() => setArchivedModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                {language === 'ms' ? 'Selesai' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
