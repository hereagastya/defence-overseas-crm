import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { apiClient } from '@/lib/api-client';
import type { AuthUser } from '@/store/useAuthStore';
import type { ApiResponse } from '@doc/shared';

interface SessionResponse {
  user: AuthUser;
  token: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { token, setAuth, clearAuth } = useAuthStore();
  const verified = useRef(false);

  useEffect(() => {
    if (verified.current || !token) return;
    verified.current = true;

    apiClient
      .get<ApiResponse<SessionResponse>>('/auth/session')
      .then(({ data }) => {
        setAuth(data.data.token, data.data.user);
      })
      .catch(() => {
        clearAuth();
      });
  }, [token, setAuth, clearAuth]);

  return <>{children}</>;
}
