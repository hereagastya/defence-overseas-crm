import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@doc/shared';

export interface AuthUser {
  id: string;
  employee_id: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isReady: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  setReady: (ready: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isReady: false,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
      setReady: (ready) => set({ isReady: ready }),
    }),
    {
      name: 'doc-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
