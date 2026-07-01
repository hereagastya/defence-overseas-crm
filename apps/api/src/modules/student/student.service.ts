import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/AppError';
import { logActivity } from '../../database/activityLogger';
import { assertCan } from '../../permissions/policies';
import { Actions } from '../../permissions/roles';
import * as studentRepo from './student.repository';
import { StudentStage, UserRole } from '@doc/shared';
import type {
  StudentWithCounselor,
  UpdateStudentInput,
  UpdateStudentStageInput,
  StudentFiltersInput,
} from '@doc/shared';
import type { AuthenticatedUser } from '../../types/api.types';
import type { ActivityEntry, NoteEntry } from './student.repository';
import { buildPagination } from '../../utils/apiResponse';
import type { Pagination } from '@doc/shared';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === UserRole.ADMIN;
}

function isStudentVisible(student: StudentWithCounselor, user: AuthenticatedUser): boolean {
  if (isAdmin(user)) return true;
  return student.assigned_counselor_id === user.id || student.assigned_counselor_id === null;
}

function isStudentEditable(student: StudentWithCounselor, user: AuthenticatedUser): boolean {
  if (isAdmin(user)) return true;
  return student.assigned_counselor_id === user.id;
}

async function fetchVisibleStudent(
  id: string,
  user: AuthenticatedUser,
): Promise<StudentWithCounselor> {
  const student = await studentRepo.findById(id);
  if (!student || !isStudentVisible(student, user)) {
    throw new AppError('STUDENT_NOT_FOUND', 404, 'Student not found');
  }
  return student;
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function listStudents(
  filters: StudentFiltersInput,
  user: AuthenticatedUser,
): Promise<{ students: StudentWithCounselor[]; pagination: Pagination }> {
  assertCan(user, Actions.STUDENTS_READ);

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;

  const { students, total } = await studentRepo.findAll(filters, user.id, isAdmin(user));
  return { students, pagination: buildPagination(total, page, limit) };
}

export async function getStudent(
  id: string,
  user: AuthenticatedUser,
): Promise<StudentWithCounselor> {
  assertCan(user, Actions.STUDENTS_READ);
  return fetchVisibleStudent(id, user);
}

export async function updateStudent(
  id: string,
  input: UpdateStudentInput,
  user: AuthenticatedUser,
): Promise<StudentWithCounselor> {
  assertCan(user, Actions.STUDENTS_UPDATE);

  const existing = await fetchVisibleStudent(id, user);

  if (!isStudentEditable(existing, user)) {
    throw new AppError('FORBIDDEN', 403, 'You can only edit students assigned to you');
  }

  if (existing.case_closed_at && !isAdmin(user)) {
    throw new AppError('CASE_CLOSED', 409, 'This case is closed. Contact an admin to re-open it');
  }

  if (input.assigned_counselor_id !== undefined && input.assigned_counselor_id !== null) {
    await assertCounselorExists(input.assigned_counselor_id);
  }

  const dbFields: Record<string, unknown> = {};
  if (input.full_name !== undefined) dbFields.full_name = input.full_name;
  if (input.email !== undefined) dbFields.email = input.email || null;
  if (input.phone !== undefined) dbFields.phone = input.phone;
  if (input.date_of_birth !== undefined) dbFields.date_of_birth = input.date_of_birth || null;
  if (input.country !== undefined) dbFields.country = input.country || null;
  if (input.nationality !== undefined) dbFields.nationality = input.nationality || null;
  if (input.course !== undefined) dbFields.course = input.course || null;
  if (input.passport_number !== undefined) dbFields.passport_number = input.passport_number || null;
  if (input.lead_score !== undefined) dbFields.lead_score = input.lead_score;
  if (input.assigned_counselor_id !== undefined) {
    dbFields.assigned_counselor_id = input.assigned_counselor_id ?? null;
  }

  if (Object.keys(dbFields).length === 0) {
    return existing;
  }

  const updated = await studentRepo.update(id, dbFields);

  logActivity({
    actor_id: user.id,
    entity_type: 'student',
    entity_id: id,
    action: 'updated',
    previous_value: buildSnapshot(existing),
    new_value: buildSnapshot(updated),
  });

  return updated;
}

export async function updateStudentStage(
  id: string,
  input: UpdateStudentStageInput,
  user: AuthenticatedUser,
): Promise<StudentWithCounselor> {
  assertCan(user, Actions.STUDENTS_UPDATE);

  const existing = await fetchVisibleStudent(id, user);

  if (!isStudentEditable(existing, user)) {
    throw new AppError('FORBIDDEN', 403, 'You can only update stages for students assigned to you');
  }

  // Non-admins cannot mutate a closed case; admins can re-open
  if (existing.case_closed_at && !isAdmin(user)) {
    throw new AppError('CASE_CLOSED', 409, 'This case is closed. Contact an admin to re-open it');
  }

  const dbFields: Record<string, unknown> = { student_stage: input.student_stage };

  // Auto-set case_closed_at when transitioning to CASE_CLOSED
  if (input.student_stage === StudentStage.CASE_CLOSED && !existing.case_closed_at) {
    dbFields.case_closed_at = new Date().toISOString();
  }

  // Clear case_closed_at when admin re-opens a closed case
  if (
    existing.student_stage === StudentStage.CASE_CLOSED &&
    input.student_stage !== StudentStage.CASE_CLOSED
  ) {
    dbFields.case_closed_at = null;
  }

  const updated = await studentRepo.update(id, dbFields);

  logActivity({
    actor_id: user.id,
    entity_type: 'student',
    entity_id: id,
    action: 'stage_changed',
    previous_value: {
      student_stage: existing.student_stage,
      case_closed_at: existing.case_closed_at,
    },
    new_value: {
      student_stage: updated.student_stage,
      case_closed_at: updated.case_closed_at,
    },
    metadata: input.notes ? { notes: input.notes } : undefined,
  });

  return updated;
}

export async function assignStudent(
  id: string,
  counselorId: string,
  user: AuthenticatedUser,
): Promise<StudentWithCounselor> {
  assertCan(user, Actions.STUDENTS_UPDATE);

  const existing = await fetchVisibleStudent(id, user);

  // Counselors may only assign students that are unassigned or already assigned to them
  if (
    !isAdmin(user) &&
    existing.assigned_counselor_id !== null &&
    existing.assigned_counselor_id !== user.id
  ) {
    throw new AppError(
      'FORBIDDEN',
      403,
      'You can only assign students that are unassigned or assigned to you',
    );
  }

  await assertCounselorExists(counselorId);

  const updated = await studentRepo.update(id, { assigned_counselor_id: counselorId });

  logActivity({
    actor_id: user.id,
    entity_type: 'student',
    entity_id: id,
    action: 'assigned',
    previous_value: { assigned_counselor_id: existing.assigned_counselor_id },
    new_value: { assigned_counselor_id: counselorId },
  });

  return updated;
}

export async function getStudentNotes(id: string, user: AuthenticatedUser): Promise<NoteEntry[]> {
  assertCan(user, Actions.NOTES_READ);
  await fetchVisibleStudent(id, user);
  return studentRepo.findNotes(id);
}

export async function addStudentNote(
  id: string,
  content: string,
  user: AuthenticatedUser,
): Promise<NoteEntry> {
  assertCan(user, Actions.NOTES_CREATE);
  await fetchVisibleStudent(id, user);

  const note = await studentRepo.createNote(id, content, user.id);

  logActivity({
    actor_id: user.id,
    entity_type: 'student',
    entity_id: id,
    action: 'note_added',
    new_value: { note_id: note.id },
  });

  return note;
}

export async function getStudentActivity(
  id: string,
  user: AuthenticatedUser,
): Promise<ActivityEntry[]> {
  assertCan(user, Actions.ACTIVITY_LOGS_READ);
  const student = await studentRepo.findById(id);
  if (!student) throw new AppError('STUDENT_NOT_FOUND', 404, 'Student not found');
  return studentRepo.findActivity(id);
}

export async function getStudentTimeline(
  id: string,
  user: AuthenticatedUser,
): Promise<ActivityEntry[]> {
  assertCan(user, Actions.STUDENTS_READ);
  const student = await fetchVisibleStudent(id, user);
  return studentRepo.findTimeline(id, student.lead_id);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function assertCounselorExists(counselorId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, is_active')
    .eq('id', counselorId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to validate counselor');
  }
  if (!data) {
    throw new AppError('COUNSELOR_NOT_FOUND', 404, 'Counselor not found');
  }
  const row = data as { id: string; is_active: boolean };
  if (!row.is_active) {
    throw new AppError('COUNSELOR_INACTIVE', 400, 'Cannot assign a student to an inactive user');
  }
}

function buildSnapshot(student: StudentWithCounselor): Record<string, unknown> {
  return {
    full_name: student.full_name,
    phone: student.phone,
    student_stage: student.student_stage,
    lead_score: student.lead_score,
    assigned_counselor_id: student.assigned_counselor_id,
    case_closed_at: student.case_closed_at,
  };
}
