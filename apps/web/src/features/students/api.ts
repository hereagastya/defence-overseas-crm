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
  UniversityApplication,
  CreateApplicationInput,
  UpdateApplicationInput,
  Document as StudentDocument,
  DocumentType,
  StudentFeeWithInstallments,
  Payment,
  AssignFeeInput,
  UpdateFeeInput,
  RecordInstallmentInput,
  UpdateInstallmentInput,
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
  applications: (id: string) => [...STUDENTS_KEY, id, 'applications'] as const,
  documents: (id: string) => [...STUDENTS_KEY, id, 'documents'] as const,
  fees: (id: string) => [...STUDENTS_KEY, id, 'fees'] as const,
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

// ── Applications ──────────────────────────────────────────────────────────────

function appBase(studentId: string) {
  return API_ENDPOINTS.APPLICATIONS.LIST.replace(':studentId', studentId);
}

function appItem(studentId: string, id: string) {
  return API_ENDPOINTS.APPLICATIONS.UPDATE.replace(':studentId', studentId).replace(':id', id);
}

export function useStudentApplications(studentId: string) {
  return useQuery({
    queryKey: studentKeys.applications(studentId),
    queryFn: () =>
      apiClient
        .get<ApiResponse<UniversityApplication[]>>(appBase(studentId))
        .then((r) => r.data.data),
    enabled: Boolean(studentId),
  });
}

export function useCreateApplication(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApplicationInput) =>
      apiClient
        .post<ApiResponse<UniversityApplication>>(appBase(studentId), input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.applications(studentId) });
    },
  });
}

export function useUpdateApplication(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateApplicationInput }) =>
      apiClient
        .patch<ApiResponse<UniversityApplication>>(appItem(studentId, id), input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.applications(studentId) });
    },
  });
}

export function useDeleteApplication(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(appItem(studentId, id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.applications(studentId) });
    },
  });
}

// ── Documents ─────────────────────────────────────────────────────────────────

function docBase(studentId: string) {
  return API_ENDPOINTS.DOCUMENTS.LIST.replace(':studentId', studentId);
}

function docItem(studentId: string, id: string) {
  return API_ENDPOINTS.DOCUMENTS.DELETE.replace(':studentId', studentId).replace(':id', id);
}

function docDownload(studentId: string, id: string) {
  return API_ENDPOINTS.DOCUMENTS.DOWNLOAD.replace(':studentId', studentId).replace(':id', id);
}

export function useStudentDocuments(studentId: string) {
  return useQuery({
    queryKey: studentKeys.documents(studentId),
    queryFn: () =>
      apiClient.get<ApiResponse<StudentDocument[]>>(docBase(studentId)).then((r) => r.data.data),
    enabled: Boolean(studentId),
  });
}

export interface UploadDocumentFormInput {
  document_type: DocumentType;
  application_id?: string;
  file: File;
}

export function useUploadDocument(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ document_type, application_id, file }: UploadDocumentFormInput) => {
      const form = new FormData();
      form.append('file', file);
      form.append('document_type', document_type);
      if (application_id) form.append('application_id', application_id);
      return apiClient
        .post<ApiResponse<StudentDocument>>(docBase(studentId), form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.documents(studentId) });
    },
  });
}

export function useDownloadDocument(studentId: string) {
  return useMutation({
    mutationFn: (id: string) =>
      apiClient
        .get<
          ApiResponse<{ url: string; expires_at: string; document: StudentDocument }>
        >(docDownload(studentId, id))
        .then((r) => r.data.data),
  });
}

export function useDeleteDocument(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(docItem(studentId, id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.documents(studentId) });
    },
  });
}

// ── Fees ──────────────────────────────────────────────────────────────────────

function feeBase(studentId: string) {
  return API_ENDPOINTS.FEES.LIST.replace(':studentId', studentId);
}

function feeItem(studentId: string, feeId: string) {
  return API_ENDPOINTS.FEES.UPDATE.replace(':studentId', studentId).replace(':feeId', feeId);
}

function paymentBase(studentId: string, feeId: string) {
  return API_ENDPOINTS.PAYMENTS.RECORD.replace(':studentId', studentId).replace(':feeId', feeId);
}

function paymentItem(studentId: string, feeId: string, paymentId: string) {
  return API_ENDPOINTS.PAYMENTS.UPDATE.replace(':studentId', studentId)
    .replace(':feeId', feeId)
    .replace(':paymentId', paymentId);
}

function paymentReceipt(studentId: string, feeId: string, paymentId: string) {
  return API_ENDPOINTS.PAYMENTS.RECEIPT.replace(':studentId', studentId)
    .replace(':feeId', feeId)
    .replace(':paymentId', paymentId);
}

export function useStudentFees(studentId: string) {
  return useQuery({
    queryKey: studentKeys.fees(studentId),
    queryFn: () =>
      apiClient
        .get<ApiResponse<StudentFeeWithInstallments[]>>(feeBase(studentId))
        .then((r) => r.data.data),
    enabled: Boolean(studentId),
  });
}

export function useAssignFee(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignFeeInput) =>
      apiClient
        .post<ApiResponse<StudentFeeWithInstallments>>(feeBase(studentId), input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.fees(studentId) });
    },
  });
}

export function useUpdateFee(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ feeId, input }: { feeId: string; input: UpdateFeeInput }) =>
      apiClient
        .patch<ApiResponse<StudentFeeWithInstallments>>(feeItem(studentId, feeId), input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.fees(studentId) });
    },
  });
}

export function useDeleteFee(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (feeId: string) => apiClient.delete(feeItem(studentId, feeId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.fees(studentId) });
    },
  });
}

// ── Payments (installments) ───────────────────────────────────────────────────

export function useRecordPayment(studentId: string, feeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordInstallmentInput) =>
      apiClient
        .post<ApiResponse<Payment>>(paymentBase(studentId, feeId), input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.fees(studentId) });
    },
  });
}

export function useUpdatePayment(studentId: string, feeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, input }: { paymentId: string; input: UpdateInstallmentInput }) =>
      apiClient
        .patch<ApiResponse<Payment>>(paymentItem(studentId, feeId, paymentId), input)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.fees(studentId) });
    },
  });
}

export function useDeletePayment(studentId: string, feeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => apiClient.delete(paymentItem(studentId, feeId, paymentId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.fees(studentId) });
    },
  });
}

export function useDownloadReceipt(studentId: string, feeId: string) {
  return useMutation({
    mutationFn: (paymentId: string) =>
      apiClient
        .get<
          ApiResponse<{ url: string; expires_at: string; receipt_number: string }>
        >(paymentReceipt(studentId, feeId, paymentId))
        .then((r) => r.data.data),
  });
}
