import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { DarkColors, LightColors } from '../constants/colors';

type Theme = 'dark' | 'light';

export interface ColorTokens {
  bg: string;
  surface: string;
  surfaceHigh: string;
  border: string;
  primary: string;
  primaryDim: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  tabBar: string;
  tabBarBorder: string;
  bookmark: string;
  searchBg: string;
  success: string;
  danger: string;
}

interface ThemeState {
  theme: Theme;
  colors: ColorTokens;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// expo-secure-store adapter for zustand persist
const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      colors: DarkColors as ColorTokens,
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'dark' ? 'light' : 'dark';
          return { theme: next, colors: (next === 'dark' ? DarkColors : LightColors) as ColorTokens };
        }),
      setTheme: (theme) =>
        set({ theme, colors: (theme === 'dark' ? DarkColors : LightColors) as ColorTokens }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => secureStoreAdapter),
      partialize: (s) => ({ theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.colors = (state.theme === 'dark' ? DarkColors : LightColors) as ColorTokens;
        }
      },
    }
  )
);
