import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { apiClient } from '@/lib/api-client';
import type { UserRole } from '@doc/shared';
import type { ApiResponse } from '@doc/shared';

interface SessionProfile {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  employee: {
    id: string;
    full_name: string;
    phone: string;
    designation: string | null;
    avatar_url: string | null;
    created_at: string;
  } | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { token, setAuth, clearAuth, setReady } = useAuthStore();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!token) {
      setReady(true);
      return;
    }

    apiClient
      .get<ApiResponse<SessionProfile>>('/auth/session')
      .then(({ data }) => {
        const profile = data.data;
        setAuth(token, {
          id: profile.id,
          employee_id: profile.employee?.id ?? '',
          email: profile.email,
          role: profile.role as UserRole,
          full_name: profile.employee?.full_name ?? profile.email,
          avatar_url: profile.employee?.avatar_url ?? null,
        });
      })
      .catch(() => clearAuth())
      .finally(() => setReady(true));
  }, []); // intentionally empty — runs once on mount

  return <>{children}</>;
}
