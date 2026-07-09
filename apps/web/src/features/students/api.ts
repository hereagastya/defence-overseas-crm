import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@doc/shared';
import type {
  PaginatedResponse,
  ApiResponse,
  StudentWithCounselor,
  UpdateStudentInput,
  UpdateStudentStageInput,
  StudentFiltersInput,
  TaskPriority,
  FollowupType,
} from '@doc/shared';

// ── Local types ────────────────────────────────────────────────────────────────

export interface StudentNoteEntry {
  id: string;
  content: string;
  lead_id: string | null;
  student_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  author_name: string | null;
}

export interface StudentActivityEntry {
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

export interface StudentTaskWithUsers {
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

export interface StudentFollowupWithUsers {
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

export interface CreateTaskForStudentInput {
  title: string;
  description?: string;
  assigned_to: string;
  priority: TaskPriority;
  due_date: string;
  student_id: string;
}

export interface CreateFollowUpForStudentInput {
  type: FollowupType;
  assigned_to: string;
  scheduled_at: string;
  notes?: string;
  student_id: string;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const STUDENTS_KEY = ['students'] as const;

export const studentKeys = {
  list: (filters?: StudentFiltersInput) => [...STUDENTS_KEY, 'list', filters ?? {}] as const,
  detail: (id: string) => [...STUDENTS_KEY, id] as const,
  notes: (id: string) => [...STUDENTS_KEY, id, 'notes'] as const,
  activity: (id: string) => [...STUDENTS_KEY, id, 'activity'] as const,
  timeline: (id: string) => [...STUDENTS_KEY, id, 'timeline'] as const,
  tasks: (id: string) => [...STUDENTS_KEY, id, 'tasks'] as const,
  followups: (id: string) => [...STUDENTS_KEY, id, 'followups'] as const,
};

// ── Students ──────────────────────────────────────────────────────────────────

export function useStudents(filters: StudentFiltersInput) {
  return useQuery({
    queryKey: studentKeys.list(filters),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<StudentWithCounselor>>(API_ENDPOINTS.STUDENTS.LIST, {
          params: filters,
        })
        .then((r) => r.data.data),
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: studentKeys.detail(id),
    queryFn: () =>
      apiClient
        .get<ApiResponse<StudentWithCounselor>>(API_ENDPOINTS.STUDENTS.GET.replace(':id', id))
        .then((r) => r.data.data),
    enabled: Boolean(id),
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStudentInput }) =>
      apiClient
        .patch<
          ApiResponse<StudentWithCounselor>
        >(API_ENDPOINTS.STUDENTS.UPDATE.replace(':id', id), input)
        .then((r) => r.data.data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(id) });
    },
  });
}

export function useUpdateStudentStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStudentStageInput }) =>
      apiClient
        .patch<
          ApiResponse<StudentWithCounselor>
        >(API_ENDPOINTS.STUDENTS.UPDATE_STAGE.replace(':id', id), input)
        .then((r) => r.data.data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
    },
  });
}

export function useAssignStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, counselor_id }: { id: string; counselor_id: string }) =>
      apiClient
        .patch<
          ApiResponse<StudentWithCounselor>
        >(API_ENDPOINTS.STUDENTS.ASSIGN.replace(':id', id), { counselor_id })
        .then((r) => r.data.data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
    },
  });
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function useStudentNotes(studentId: string) {
  return useQuery({
    queryKey: studentKeys.notes(studentId),
    queryFn: () =>
      apiClient
        .get<
          ApiResponse<StudentNoteEntry[]>
        >(API_ENDPOINTS.STUDENTS.NOTES.replace(':id', studentId))
        .then((r) => r.data.data),
    enabled: Boolean(studentId),
  });
}

export function useAddStudentNote(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiClient
        .post<
          ApiResponse<StudentNoteEntry>
        >(API_ENDPOINTS.STUDENTS.NOTES.replace(':id', studentId), { content })
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.notes(studentId) });
    },
  });
}

export function useUpdateStudentNote(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      apiClient
        .patch<ApiResponse<StudentNoteEntry>>(API_ENDPOINTS.NOTES.UPDATE.replace(':id', noteId), {
          content,
        })
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.notes(studentId) });
    },
  });
}

export function useDeleteStudentNote(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) =>
      apiClient.delete(API_ENDPOINTS.NOTES.DELETE.replace(':id', noteId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.notes(studentId) });
    },
  });
}

// ── Timeline & Activity ───────────────────────────────────────────────────────

export function useStudentTimeline(studentId: string) {
  return useQuery({
    queryKey: studentKeys.timeline(studentId),
    queryFn: () =>
      apiClient
        .get<
          ApiResponse<StudentActivityEntry[]>
        >(API_ENDPOINTS.STUDENTS.TIMELINE.replace(':id', studentId))
        .then((r) => r.data.data),
    enabled: Boolean(studentId),
  });
}

export function useStudentActivity(studentId: string) {
  return useQuery({
    queryKey: studentKeys.activity(studentId),
    queryFn: () =>
      apiClient
        .get<
          ApiResponse<StudentActivityEntry[]>
        >(API_ENDPOINTS.STUDENTS.ACTIVITY.replace(':id', studentId))
        .then((r) => r.data.data),
    enabled: Boolean(studentId),
  });
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export function useStudentTasks(studentId: string) {
  return useQuery({
    queryKey: studentKeys.tasks(studentId),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<StudentTaskWithUsers>>(API_ENDPOINTS.TASKS.LIST, {
          params: { student_id: studentId, limit: 100 },
        })
        .then((r) => r.data.data.items),
    enabled: Boolean(studentId),
  });
}

export function useCreateStudentTask(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskForStudentInput) =>
      apiClient
        .post<ApiResponse<StudentTaskWithUsers>>(API_ENDPOINTS.TASKS.CREATE, input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.tasks(studentId) });
    },
  });
}

export function useCompleteStudentTask(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      apiClient
        .patch<
          ApiResponse<StudentTaskWithUsers>
        >(API_ENDPOINTS.TASKS.COMPLETE.replace(':id', taskId))
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.tasks(studentId) });
    },
  });
}

// ── Follow-ups ────────────────────────────────────────────────────────────────

export function useStudentFollowUps(studentId: string) {
  return useQuery({
    queryKey: studentKeys.followups(studentId),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<StudentFollowupWithUsers>>(API_ENDPOINTS.FOLLOW_UPS.LIST, {
          params: { student_id: studentId, limit: 100 },
        })
        .then((r) => r.data.data.items),
    enabled: Boolean(studentId),
  });
}

export function useCreateStudentFollowUp(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFollowUpForStudentInput) =>
      apiClient
        .post<ApiResponse<StudentFollowupWithUsers>>(API_ENDPOINTS.FOLLOW_UPS.CREATE, input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.followups(studentId) });
    },
  });
}

export function useCompleteStudentFollowUp(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ followUpId, outcome }: { followUpId: string; outcome: string }) =>
      apiClient
        .patch<
          ApiResponse<StudentFollowupWithUsers>
        >(API_ENDPOINTS.FOLLOW_UPS.COMPLETE.replace(':id', followUpId), { outcome })
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.followups(studentId) });
    },
  });
}
