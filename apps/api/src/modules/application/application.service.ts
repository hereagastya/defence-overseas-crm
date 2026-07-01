import { AppError } from '../../utils/AppError';
import { logActivity } from '../../database/activityLogger';
import { assertCan } from '../../permissions/policies';
import { Actions } from '../../permissions/roles';
import { UserRole } from '@doc/shared';
import type {
  UniversityApplication,
  CreateApplicationInput,
  UpdateApplicationInput,
  StudentWithCounselor,
} from '@doc/shared';
import type { AuthenticatedUser } from '../../types/api.types';
import * as applicationRepo from './application.repository';
import { findById as findStudentById } from '../student/student.repository';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === UserRole.ADMIN;
}

/** Returns the student if it exists and is visible to the user; throws 404 otherwise. */
async function assertStudentVisible(
  studentId: string,
  user: AuthenticatedUser,
): Promise<StudentWithCounselor> {
  const student = await findStudentById(studentId);
  if (!student) throw new AppError('STUDENT_NOT_FOUND', 404, 'Student not found');

  const visible =
    isAdmin(user) ||
    student.assigned_counselor_id === user.id ||
    student.assigned_counselor_id === null;

  if (!visible) throw new AppError('STUDENT_NOT_FOUND', 404, 'Student not found');
  return student;
}

/** Throws FORBIDDEN if the counselor does not own the student. */
function assertStudentEditable(student: StudentWithCounselor, user: AuthenticatedUser): void {
  if (isAdmin(user)) return;
  if (student.assigned_counselor_id !== user.id) {
    throw new AppError(
      'FORBIDDEN',
      403,
      'You can only modify applications for students assigned to you',
    );
  }
}

/** Fetches and validates that the application exists and belongs to the student. */
async function fetchOwnedApplication(
  studentId: string,
  applicationId: string,
): Promise<UniversityApplication> {
  const application = await applicationRepo.findById(applicationId);
  if (!application || application.student_id !== studentId) {
    throw new AppError('APPLICATION_NOT_FOUND', 404, 'Application not found');
  }
  return application;
}

function buildSnapshot(app: UniversityApplication): Record<string, unknown> {
  return {
    university_name: app.university_name,
    country: app.country,
    course: app.course,
    status: app.status,
    applied_at: app.applied_at,
    offer_received_at: app.offer_received_at,
    offer_responded_at: app.offer_responded_at,
  };
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function listApplications(
  studentId: string,
  user: AuthenticatedUser,
): Promise<UniversityApplication[]> {
  assertCan(user, Actions.APPLICATIONS_READ);
  await assertStudentVisible(studentId, user);
  return applicationRepo.findAll(studentId);
}

export async function getApplication(
  studentId: string,
  applicationId: string,
  user: AuthenticatedUser,
): Promise<UniversityApplication> {
  assertCan(user, Actions.APPLICATIONS_READ);
  await assertStudentVisible(studentId, user);
  return fetchOwnedApplication(studentId, applicationId);
}

export async function createApplication(
  studentId: string,
  input: CreateApplicationInput,
  user: AuthenticatedUser,
): Promise<UniversityApplication> {
  assertCan(user, Actions.APPLICATIONS_CREATE);
  const student = await assertStudentVisible(studentId, user);
  assertStudentEditable(student, user);

  const application = await applicationRepo.create(studentId, input, user.id);

  logActivity({
    actor_id: user.id,
    entity_type: 'application',
    entity_id: application.id,
    action: 'created',
    new_value: {
      student_id: studentId,
      university_name: application.university_name,
      course: application.course,
      status: application.status,
    },
  });

  return application;
}

export async function updateApplication(
  studentId: string,
  applicationId: string,
  input: UpdateApplicationInput,
  user: AuthenticatedUser,
): Promise<UniversityApplication> {
  assertCan(user, Actions.APPLICATIONS_UPDATE);
  const student = await assertStudentVisible(studentId, user);
  assertStudentEditable(student, user);

  const existing = await fetchOwnedApplication(studentId, applicationId);

  const dbFields: Record<string, unknown> = {};
  if (input.university_name !== undefined) dbFields.university_name = input.university_name;
  if (input.country !== undefined) dbFields.country = input.country;
  if (input.course !== undefined) dbFields.course = input.course;
  if (input.status !== undefined) dbFields.status = input.status;
  if (input.applied_at !== undefined) dbFields.applied_at = input.applied_at || null;
  if (input.offer_received_at !== undefined)
    dbFields.offer_received_at = input.offer_received_at || null;
  if (input.offer_responded_at !== undefined)
    dbFields.offer_responded_at = input.offer_responded_at || null;
  if (input.notes !== undefined) dbFields.notes = input.notes || null;

  if (Object.keys(dbFields).length === 0) {
    return existing;
  }

  const updated = await applicationRepo.update(applicationId, dbFields);

  logActivity({
    actor_id: user.id,
    entity_type: 'application',
    entity_id: applicationId,
    action: 'updated',
    previous_value: buildSnapshot(existing),
    new_value: buildSnapshot(updated),
  });

  return updated;
}

export async function deleteApplication(
  studentId: string,
  applicationId: string,
  user: AuthenticatedUser,
): Promise<void> {
  assertCan(user, Actions.APPLICATIONS_DELETE);

  const existing = await fetchOwnedApplication(studentId, applicationId);

  await applicationRepo.softDelete(applicationId);

  logActivity({
    actor_id: user.id,
    entity_type: 'application',
    entity_id: applicationId,
    action: 'deleted',
    previous_value: {
      university_name: existing.university_name,
      status: existing.status,
    },
  });
}
