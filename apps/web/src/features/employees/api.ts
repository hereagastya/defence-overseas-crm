import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@doc/shared';
import type {
  ApiResponse,
  CreateEmployeeInput,
  EmployeeWithUser,
  ResetPasswordInput,
  UpdateEmployeeInput,
} from '@doc/shared';

export const EMPLOYEES_KEY = ['employees'] as const;

export function useEmployees() {
  return useQuery({
    queryKey: EMPLOYEES_KEY,
    queryFn: () =>
      apiClient
        .get<ApiResponse<EmployeeWithUser[]>>(API_ENDPOINTS.EMPLOYEES.LIST)
        .then((r) => r.data.data),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: [...EMPLOYEES_KEY, id],
    queryFn: () =>
      apiClient
        .get<ApiResponse<EmployeeWithUser>>(API_ENDPOINTS.EMPLOYEES.GET.replace(':id', id))
        .then((r) => r.data.data),
    enabled: Boolean(id),
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) =>
      apiClient
        .post<ApiResponse<EmployeeWithUser>>(API_ENDPOINTS.EMPLOYEES.CREATE, input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEmployeeInput }) =>
      apiClient
        .patch<
          ApiResponse<EmployeeWithUser>
        >(API_ENDPOINTS.EMPLOYEES.UPDATE.replace(':id', id), input)
        .then((r) => r.data.data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });
      queryClient.invalidateQueries({ queryKey: [...EMPLOYEES_KEY, id] });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResetPasswordInput }) =>
      apiClient.post(API_ENDPOINTS.EMPLOYEES.RESET_PASSWORD.replace(':id', id), input),
  });
}
