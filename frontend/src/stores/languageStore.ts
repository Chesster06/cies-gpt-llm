import { create } from 'zustand';

export type Language = 'en' | 'ms';

export interface Translations {
  // Navigation & Sidebar
  newChat: string;
  searchChats: string;
  pinned: string;
  recent: string;
  personalization: string;
  profile: string;
  settings: string;
  logIn: string;
  logOut: string;
  freePlan: string;
  lightMode: string;
  darkMode: string;

  // Settings Tabs & Common
  backToApp: string;
  search: string;
  personal: string;
  general: string;
  appearance: string;
  account: string;
  dataControls: string;
  save: string;
  cancel: string;
  saved: string;

  // General Tab
  generalHeading: string;
  generalSection: string;
  language: string;
  languageSubtitle: string;

  // Appearance Tab
  appearanceHeading: string;
  visualStyle: string;
  mode: string;
  system: string;
  light: string;
  dark: string;
  systemDesc: string;
  lightDesc: string;
  darkDesc: string;
  themePreset: string;
  accent: string;
  background: string;
  foreground: string;

  // Account Tab
  accountHeading: string;
  accountDetails: string;
  name: string;
  username: string;
  email: string;
  gptProfile: string;
  age: string;
  yearsOld: string;
  deleteAccount: string;
  deleteAccountDesc: string;

  // Data Controls Tab
  dataControlsHeading: string;
  dataManagement: string;
  sharedLinks: string;
  sharedLinksDesc: string;
  manage: string;
  improveModel: string;
  improveModelDesc: string;
  location: string;
  locationDesc: string;
  archivedChats: string;
  archivedChatsDesc: string;
  archiveAllChats: string;
  deleteAllChats: string;

  // Chat & Input
  askAnything: string;
  webSearch: string;
  stopGenerating: string;
}

const translations: Record<Language, Translations> = {
  en: {
    newChat: 'New chat',
    searchChats: 'Search chats',
    pinned: 'Pinned',
    recent: 'Recent',
    personalization: 'Personalization',
    profile: 'Profile',
    settings: 'Settings',
    logIn: 'Log in',
    logOut: 'Log out',
    freePlan: 'Free',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',

    backToApp: 'Back to app',
    search: 'Search',
    personal: 'Personal',
    general: 'General',
    appearance: 'Appearance',
    account: 'Account',
    dataControls: 'Data controls',
    save: 'Save',
    cancel: 'Cancel',
    saved: 'Saved successfully',

    generalHeading: 'General',
    generalSection: 'General',
    language: 'Language',
    languageSubtitle: 'Language for the app UI',

    appearanceHeading: 'Appearance',
    visualStyle: 'Visual style',
    mode: 'Mode',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    systemDesc: 'Follows device preferences',
    lightDesc: 'Clean high contrast theme',
    darkDesc: 'Dark mode for low-light environments',
    themePreset: 'Theme',
    accent: 'Accent',
    background: 'Background',
    foreground: 'Foreground',

    accountHeading: 'Account',
    accountDetails: 'Account details',
    name: 'Name',
    username: 'Username',
    email: 'Email',
    gptProfile: 'GPT builder profile',
    age: 'Age',
    yearsOld: 'years old',
    deleteAccount: 'Delete account',
    deleteAccountDesc: 'Permanently delete your account and all conversation history.',

    dataControlsHeading: 'Data controls',
    dataManagement: 'Data management',
    sharedLinks: 'Shared links',
    sharedLinksDesc: 'Manage your public chat links',
    manage: 'Manage',
    improveModel: 'Improve the model for everyone',
    improveModelDesc: 'Allow user chats to be used to train our AI models',
    location: 'Location',
    locationDesc: 'Location access permissions for local search queries',
    archivedChats: 'Archived chats',
    archivedChatsDesc: 'View and restore chats you have hidden',
    archiveAllChats: 'Archive all chats',
    deleteAllChats: 'Delete all chats',

    askAnything: 'Ask anything...',
    webSearch: 'Web Search',
    stopGenerating: 'Stop generating',
  },
  ms: {
    newChat: 'Sembang baharu',
    searchChats: 'Cari sembang',
    pinned: 'Disematkan',
    recent: 'Terkini',
    personalization: 'Pemperibadian',
    profile: 'Profil',
    settings: 'Tetapan',
    logIn: 'Log masuk',
    logOut: 'Log keluar',
    freePlan: 'Percuma',
    lightMode: 'Mod Cerah',
    darkMode: 'Mod Gelap',

    backToApp: 'Kembali ke aplikasi',
    search: 'Cari',
    personal: 'Peribadi',
    general: 'Umum',
    appearance: 'Paparan',
    account: 'Akaun',
    dataControls: 'Kawalan data',
    save: 'Simpan',
    cancel: 'Batal',
    saved: 'Berjaya disimpan',

    generalHeading: 'Umum',
    generalSection: 'Umum',
    language: 'Bahasa',
    languageSubtitle: 'Bahasa untuk antara muka aplikasi',

    appearanceHeading: 'Paparan',
    visualStyle: 'Gaya visual',
    mode: 'Mod',
    system: 'Sistem',
    light: 'Cerah',
    dark: 'Gelap',
    systemDesc: 'Mengikut tetapan peranti',
    lightDesc: 'Tema cerah berkepekatan tinggi',
    darkDesc: 'Mod gelap sesuai suasana malap',
    themePreset: 'Tema',
    accent: 'Aksen',
    background: 'Latar Belakang',
    foreground: 'Warna Teks',

    accountHeading: 'Akaun',
    accountDetails: 'Maklumat akaun',
    name: 'Nama',
    username: 'Nama pengguna',
    email: 'E-mel',
    gptProfile: 'Profil pembina GPT',
    age: 'Umur',
    yearsOld: 'tahun',
    deleteAccount: 'Padam akaun',
    deleteAccountDesc: 'Padam akaun dan semua sejarah perbualan anda secara kekal.',

    dataControlsHeading: 'Kawalan data',
    dataManagement: 'Pengurusan data',
    sharedLinks: 'Pautan kongsi',
    sharedLinksDesc: 'Urus pautan sembang awam anda',
    manage: 'Urus',
    improveModel: 'Tingkatkan model untuk semua orang',
    improveModelDesc: 'Benarkan sembang pengguna digunakan untuk melatih model AI kami',
    location: 'Lokasi',
    locationDesc: 'Kebenaran capaian lokasi untuk carian tempatan',
    archivedChats: 'Sembang diarkibkan',
    archivedChatsDesc: 'Lihat dan pulihkan sembang yang disembunyikan',
    archiveAllChats: 'Arkibkan semua sembang',
    deleteAllChats: 'Padam semua sembang',

    askAnything: 'Tanya apa sahaja...',
    webSearch: 'Carian Web',
    stopGenerating: 'Hentikan penjanaan',
  },
};

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const getInitialLanguage = (): Language => {
  const saved = localStorage.getItem('cies_language') as Language;
  if (saved === 'en' || saved === 'ms') {
    return saved;
  }
  return 'en';
};

export const useLanguageStore = create<LanguageState>((set) => {
  const initialLang = getInitialLanguage();
  return {
    language: initialLang,
    t: translations[initialLang],
    setLanguage: (lang: Language) => {
      localStorage.setItem('cies_language', lang);
      set({
        language: lang,
        t: translations[lang],
      });
    },
  };
});
