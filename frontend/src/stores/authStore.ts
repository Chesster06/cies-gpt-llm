import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (partialUser: Partial<User>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const userStr = localStorage.getItem('cies_user');
  let user: User | null = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
      // Clean up legacy dummy demo guest accounts
      if (user?.name === 'Guest' || user?.email === 'dev@cies.ai') {
        localStorage.removeItem('cies_token');
        localStorage.removeItem('cies_user');
        user = null;
      }
    } catch {
      user = null;
    }
  }
  const token = user ? localStorage.getItem('cies_token') : null;

  return {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading: false,
    setAuth: (user, token) => {
      localStorage.setItem('cies_token', token);
      localStorage.setItem('cies_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false });
    },
    updateUser: (partialUser) => {
      set((state) => {
        const updated = state.user
          ? { ...state.user, ...partialUser }
          : ({
              id: 'local_user',
              name: partialUser.name || 'User',
              email: partialUser.email || '',
              username: partialUser.username || '',
              ...partialUser,
            } as User);
        localStorage.setItem('cies_user', JSON.stringify(updated));
        return { user: updated, isAuthenticated: true };
      });
    },
    logout: () => {
      localStorage.removeItem('cies_token');
      localStorage.removeItem('cies_user');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    },
    setLoading: (loading) => set({ isLoading: loading }),
  };
});
