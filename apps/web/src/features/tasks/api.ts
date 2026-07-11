import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@doc/shared';
import type {
  PaginatedResponse,
  ApiResponse,
  TaskFiltersInput,
  CreateTaskInput,
  UpdateTaskInput,
  FollowupFiltersInput,
  CreateFollowupInput,
  UpdateFollowupInput,
  CompleteFollowupInput,
} from '@doc/shared';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TaskWithUsers {
  id: string;
  title: string;
  description: string | null;
  lead_id: string | null;
  student_id: string | null;
  assigned_to: string;
  created_by: string;
  priority: string;
  status: string;
  due_date: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_to_name: string | null;
  created_by_name: string | null;
}

export interface FollowupWithUsers {
  id: string;
  type: string;
  lead_id: string | null;
  student_id: string | null;
  assigned_to: string;
  created_by: string;
  scheduled_at: string;
  status: string;
  outcome: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  assigned_to_name: string | null;
  created_by_name: string | null;
}

// ── Query keys ─────────────────────────────────────────────────────────────────

export const TASKS_KEY = ['tasks'] as const;
export const FOLLOWUPS_KEY = ['followups'] as const;

export const taskKeys = {
  list: (filters?: TaskFiltersInput) => [...TASKS_KEY, 'list', filters ?? {}] as const,
};

export const followupKeys = {
  list: (filters?: FollowupFiltersInput) => [...FOLLOWUPS_KEY, 'list', filters ?? {}] as const,
};

// ── Task hooks ─────────────────────────────────────────────────────────────────

export function useTasks(filters: TaskFiltersInput) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<TaskWithUsers>>(API_ENDPOINTS.TASKS.LIST, { params: filters })
        .then((r) => r.data.data),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      apiClient
        .post<ApiResponse<TaskWithUsers>>(API_ENDPOINTS.TASKS.CREATE, input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      apiClient
        .patch<ApiResponse<TaskWithUsers>>(API_ENDPOINTS.TASKS.UPDATE.replace(':id', id), input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(API_ENDPOINTS.TASKS.DELETE.replace(':id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient
        .patch<ApiResponse<TaskWithUsers>>(API_ENDPOINTS.TASKS.COMPLETE.replace(':id', id))
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useReopenTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient
        .patch<ApiResponse<TaskWithUsers>>(API_ENDPOINTS.TASKS.REOPEN.replace(':id', id))
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

// ── Follow-up hooks ────────────────────────────────────────────────────────────

export function useFollowUps(filters: FollowupFiltersInput) {
  return useQuery({
    queryKey: followupKeys.list(filters),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<FollowupWithUsers>>(API_ENDPOINTS.FOLLOW_UPS.LIST, {
          params: filters,
        })
        .then((r) => r.data.data),
  });
}

export function useCreateFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFollowupInput) =>
      apiClient
        .post<ApiResponse<FollowupWithUsers>>(API_ENDPOINTS.FOLLOW_UPS.CREATE, input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLLOWUPS_KEY });
    },
  });
}

export function useUpdateFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFollowupInput }) =>
      apiClient
        .patch<
          ApiResponse<FollowupWithUsers>
        >(API_ENDPOINTS.FOLLOW_UPS.UPDATE.replace(':id', id), input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLLOWUPS_KEY });
    },
  });
}

export function useDeleteFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(API_ENDPOINTS.FOLLOW_UPS.DELETE.replace(':id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLLOWUPS_KEY });
    },
  });
}

export function useCompleteFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CompleteFollowupInput }) =>
      apiClient
        .patch<
          ApiResponse<FollowupWithUsers>
        >(API_ENDPOINTS.FOLLOW_UPS.COMPLETE.replace(':id', id), input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLLOWUPS_KEY });
    },
  });
}
