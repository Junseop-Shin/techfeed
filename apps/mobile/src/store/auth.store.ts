import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client';
import { getProfile } from '../api/users';

const TOKEN_KEY = 'auth_token';
const PUSH_ENABLED_KEY = 'push_enabled';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  pushEnabled: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  restoreToken: () => Promise<void>;
  setPushEnabled: (enabled: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,
  pushEnabled: true,

  login: async (token, user) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    set({ token, user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    delete apiClient.defaults.headers.common['Authorization'];
    set({ token: null, user: null });
  },

  restoreToken: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const pushValue = await SecureStore.getItemAsync(PUSH_ENABLED_KEY);
      const pushEnabled = pushValue !== 'false';

      if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const profile = await getProfile();
          set({
            token,
            user: { id: profile.id, email: profile.email, name: profile.name ?? '' },
            pushEnabled,
          });
        } catch {
          // 토큰 만료 → 자동 로그아웃
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          delete apiClient.defaults.headers.common['Authorization'];
          set({ token: null, user: null, pushEnabled });
        }
      } else {
        set({ pushEnabled });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  setPushEnabled: async (enabled: boolean) => {
    await SecureStore.setItemAsync(PUSH_ENABLED_KEY, enabled ? 'true' : 'false');
    set({ pushEnabled: enabled });
  },
}));
