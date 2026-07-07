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
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: 'doc-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
