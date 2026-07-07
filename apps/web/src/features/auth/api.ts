import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/useAuthStore';
import { API_ENDPOINTS } from '@doc/shared';
import type { ApiResponse } from '@doc/shared';
import type { LoginInput, UserRole } from '@doc/shared';

interface LoginResult {
  token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email: string;
    role: string;
    is_active: boolean;
    full_name: string | null;
    employee_id: string | null;
  };
}

export function useLogin() {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiClient
        .post<ApiResponse<LoginResult>>(API_ENDPOINTS.AUTH.LOGIN, input)
        .then((r) => r.data.data),
    onSuccess: (result) => {
      setAuth(result.token, {
        id: result.user.id,
        employee_id: result.user.employee_id ?? '',
        email: result.user.email,
        role: result.user.role as UserRole,
        full_name: result.user.full_name ?? result.user.email,
        avatar_url: null,
      });
    },
    meta: { suppressGlobalError: true },
  });
}

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post(API_ENDPOINTS.AUTH.LOGOUT),
    onSettled: () => {
      queryClient.clear();
      clearAuth();
    },
  });
}
