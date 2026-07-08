import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@doc/shared';
import type {
  PaginatedResponse,
  ApiResponse,
  LeadWithCounselor,
  CreateLeadInput,
  UpdateLeadInput,
  UpdateLeadStageInput,
  ConvertLeadInput,
  LeadFiltersInput,
  TaskPriority,
  FollowupType,
} from '@doc/shared';

// ── Local types (mirror backend repository shapes) ────────────────────────────

export interface NoteEntry {
  id: string;
  content: string;
  lead_id: string | null;
  student_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  author_name: string | null;
}

export interface ActivityEntry {
  id: string;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor_name: string | null;
}

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

export interface CreateTaskForLeadInput {
  title: string;
  description?: string;
  assigned_to: string;
  priority: TaskPriority;
  due_date: string;
  lead_id: string;
}

export interface CreateFollowUpForLeadInput {
  type: FollowupType;
  assigned_to: string;
  scheduled_at: string;
  notes?: string;
  lead_id: string;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const LEADS_KEY = ['leads'] as const;

export const leadKeys = {
  list: (filters?: LeadFiltersInput) => [...LEADS_KEY, 'list', filters ?? {}] as const,
  detail: (id: string) => [...LEADS_KEY, id] as const,
  notes: (id: string) => [...LEADS_KEY, id, 'notes'] as const,
  activity: (id: string) => [...LEADS_KEY, id, 'activity'] as const,
  tasks: (id: string) => [...LEADS_KEY, id, 'tasks'] as const,
  followups: (id: string) => [...LEADS_KEY, id, 'followups'] as const,
};

// ── Leads ─────────────────────────────────────────────────────────────────────

export function useLeads(filters: LeadFiltersInput) {
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<LeadWithCounselor>>(API_ENDPOINTS.LEADS.LIST, {
          params: filters,
        })
        .then((r) => r.data.data),
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: () =>
      apiClient
        .get<ApiResponse<LeadWithCounselor>>(API_ENDPOINTS.LEADS.GET.replace(':id', id))
        .then((r) => r.data.data),
    enabled: Boolean(id),
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeadInput) =>
      apiClient
        .post<ApiResponse<LeadWithCounselor>>(API_ENDPOINTS.LEADS.CREATE, input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLeadInput }) =>
      apiClient
        .patch<ApiResponse<LeadWithCounselor>>(API_ENDPOINTS.LEADS.UPDATE.replace(':id', id), input)
        .then((r) => r.data.data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(id) });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(API_ENDPOINTS.LEADS.DELETE.replace(':id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
    },
  });
}

export function useUpdateLeadStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLeadStageInput }) =>
      apiClient
        .patch<
          ApiResponse<LeadWithCounselor>
        >(API_ENDPOINTS.LEADS.UPDATE_STAGE.replace(':id', id), input)
        .then((r) => r.data.data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
    },
  });
}

export function useAssignLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, counselor_id }: { id: string; counselor_id: string }) =>
      apiClient
        .patch<ApiResponse<LeadWithCounselor>>(API_ENDPOINTS.LEADS.ASSIGN.replace(':id', id), {
          counselor_id,
        })
        .then((r) => r.data.data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
    },
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ConvertLeadInput }) =>
      apiClient
        .post<
          ApiResponse<{ lead: LeadWithCounselor; student_id: string }>
        >(API_ENDPOINTS.LEADS.CONVERT.replace(':id', id), input)
        .then((r) => r.data.data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
    },
  });
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function useLeadNotes(leadId: string) {
  return useQuery({
    queryKey: leadKeys.notes(leadId),
    queryFn: () =>
      apiClient
        .get<ApiResponse<NoteEntry[]>>(API_ENDPOINTS.LEADS.NOTES.replace(':id', leadId))
        .then((r) => r.data.data),
    enabled: Boolean(leadId),
  });
}

export function useAddLeadNote(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiClient
        .post<ApiResponse<NoteEntry>>(API_ENDPOINTS.LEADS.NOTES.replace(':id', leadId), {
          content,
        })
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.notes(leadId) });
    },
  });
}

export function useUpdateNote(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      apiClient
        .patch<ApiResponse<NoteEntry>>(API_ENDPOINTS.NOTES.UPDATE.replace(':id', noteId), {
          content,
        })
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.notes(leadId) });
    },
  });
}

export function useDeleteNote(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) =>
      apiClient.delete(API_ENDPOINTS.NOTES.DELETE.replace(':id', noteId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.notes(leadId) });
    },
  });
}

// ── Activity ──────────────────────────────────────────────────────────────────

export function useLeadActivity(leadId: string) {
  return useQuery({
    queryKey: leadKeys.activity(leadId),
    queryFn: () =>
      apiClient
        .get<ApiResponse<ActivityEntry[]>>(API_ENDPOINTS.LEADS.ACTIVITY.replace(':id', leadId))
        .then((r) => r.data.data),
    enabled: Boolean(leadId),
  });
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export function useLeadTasks(leadId: string) {
  return useQuery({
    queryKey: leadKeys.tasks(leadId),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<TaskWithUsers>>(API_ENDPOINTS.TASKS.LIST, {
          params: { lead_id: leadId, limit: 100 },
        })
        .then((r) => r.data.data.items),
    enabled: Boolean(leadId),
  });
}

export function useCreateLeadTask(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskForLeadInput) =>
      apiClient
        .post<ApiResponse<TaskWithUsers>>(API_ENDPOINTS.TASKS.CREATE, input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.tasks(leadId) });
    },
  });
}

export function useCompleteTask(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      apiClient
        .patch<ApiResponse<TaskWithUsers>>(API_ENDPOINTS.TASKS.COMPLETE.replace(':id', taskId))
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.tasks(leadId) });
    },
  });
}

// ── Follow-ups ────────────────────────────────────────────────────────────────

export function useLeadFollowUps(leadId: string) {
  return useQuery({
    queryKey: leadKeys.followups(leadId),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<FollowupWithUsers>>(API_ENDPOINTS.FOLLOW_UPS.LIST, {
          params: { lead_id: leadId, limit: 100 },
        })
        .then((r) => r.data.data.items),
    enabled: Boolean(leadId),
  });
}

export function useCreateLeadFollowUp(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFollowUpForLeadInput) =>
      apiClient
        .post<ApiResponse<FollowupWithUsers>>(API_ENDPOINTS.FOLLOW_UPS.CREATE, input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.followups(leadId) });
    },
  });
}

export function useCompleteFollowUp(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ followUpId, outcome }: { followUpId: string; outcome: string }) =>
      apiClient
        .patch<
          ApiResponse<FollowupWithUsers>
        >(API_ENDPOINTS.FOLLOW_UPS.COMPLETE.replace(':id', followUpId), { outcome })
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.followups(leadId) });
    },
  });
}
