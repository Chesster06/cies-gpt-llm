import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';
export type ColorPreset = 'minimalist' | 'oled' | 'slate' | 'emerald' | 'violet';
export type AccentColor = 'default' | 'blue' | 'emerald' | 'purple' | 'amber' | 'rose';

interface ThemeState {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  colorPreset: ColorPreset;
  accentColor: AccentColor;
  setTheme: (theme: Theme) => void;
  setColorPreset: (preset: ColorPreset) => void;
  setAccentColor: (accent: AccentColor) => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

const applyThemeToDOM = (effective: 'light' | 'dark', preset: ColorPreset, accent: AccentColor) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (effective === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }

  root.setAttribute('data-preset', preset);
  root.setAttribute('data-accent', accent);
};

export const useThemeStore = create<ThemeState>((set) => {
  const initialTheme = (localStorage.getItem('cies-theme') as Theme) || 'system';
  const initialPreset = (localStorage.getItem('cies-color-preset') as ColorPreset) || 'minimalist';
  const initialAccent = (localStorage.getItem('cies-accent-color') as AccentColor) || 'default';
  const effectiveTheme = initialTheme === 'system' ? getSystemTheme() : initialTheme;

  // Apply immediately on load
  applyThemeToDOM(effectiveTheme, initialPreset, initialAccent);

  return {
    theme: initialTheme,
    effectiveTheme,
    colorPreset: initialPreset,
    accentColor: initialAccent,

    setTheme: (theme: Theme) => {
      localStorage.setItem('cies-theme', theme);
      const effective = theme === 'system' ? getSystemTheme() : theme;
      set((state) => {
        applyThemeToDOM(effective, state.colorPreset, state.accentColor);
        return { theme, effectiveTheme: effective };
      });
    },

    setColorPreset: (preset: ColorPreset) => {
      localStorage.setItem('cies-color-preset', preset);
      set((state) => {
        applyThemeToDOM(state.effectiveTheme, preset, state.accentColor);
        return { colorPreset: preset };
      });
    },

    setAccentColor: (accent: AccentColor) => {
      localStorage.setItem('cies-accent-color', accent);
      set((state) => {
        applyThemeToDOM(state.effectiveTheme, state.colorPreset, accent);
        return { accentColor: accent };
      });
    },
  };
});
