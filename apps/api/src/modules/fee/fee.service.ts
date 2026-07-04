import { AppError } from '../../utils/AppError';
import { logActivity } from '../../database/activityLogger';
import { assertCan, can } from '../../permissions/policies';
import { Actions } from '../../permissions/roles';
import { UserRole, PaymentStatus, STANDARD_FEE_AMOUNTS } from '@doc/shared';
import type {
  StudentFee,
  StudentFeeWithInstallments,
  AssignFeeInput,
  UpdateFeeInput,
  StudentWithCounselor,
} from '@doc/shared';
import type { AuthenticatedUser } from '../../types/api.types';
import * as feeRepo from './fee.repository';
import { findById as findStudentById } from '../student/student.repository';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === UserRole.ADMIN;
}

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

function assertStudentEditable(student: StudentWithCounselor, user: AuthenticatedUser): void {
  if (isAdmin(user)) return;
  if (student.assigned_counselor_id !== user.id) {
    throw new AppError('FORBIDDEN', 403, 'You can only manage fees for students assigned to you');
  }
}

async function fetchOwnedFee(studentId: string, feeId: string): Promise<StudentFee> {
  const fee = await feeRepo.findById(feeId);
  if (!fee || fee.student_id !== studentId) {
    throw new AppError('FEE_NOT_FOUND', 404, 'Fee not found');
  }
  return fee;
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function listFees(
  studentId: string,
  user: AuthenticatedUser,
): Promise<StudentFeeWithInstallments[]> {
  assertCan(user, Actions.FEES_READ);
  await assertStudentVisible(studentId, user);
  return feeRepo.findAll(studentId);
}

export async function getFee(
  studentId: string,
  feeId: string,
  user: AuthenticatedUser,
): Promise<StudentFeeWithInstallments> {
  assertCan(user, Actions.FEES_READ);
  await assertStudentVisible(studentId, user);

  const fee = await feeRepo.findByIdWithInstallments(feeId);
  if (!fee || fee.student_id !== studentId) {
    throw new AppError('FEE_NOT_FOUND', 404, 'Fee not found');
  }
  return fee;
}

export async function assignFee(
  studentId: string,
  input: AssignFeeInput,
  user: AuthenticatedUser,
): Promise<StudentFee> {
  assertCan(user, Actions.FEES_ASSIGN);

  const student = await assertStudentVisible(studentId, user);
  assertStudentEditable(student, user);

  // If overriding the standard amount, require FEES_OVERRIDE
  if (input.total_amount !== undefined && !can(user, Actions.FEES_OVERRIDE)) {
    throw new AppError('FORBIDDEN', 403, 'Only admins can override the standard fee amount');
  }

  const existing = await feeRepo.findActiveByCategory(studentId, input.category);
  if (existing) {
    throw new AppError(
      'DUPLICATE_FEE',
      409,
      `An active ${input.category} fee is already assigned to this student`,
    );
  }

  const totalAmount = input.total_amount ?? STANDARD_FEE_AMOUNTS[input.category];
  const isOverridden = input.total_amount !== undefined;

  const fee = await feeRepo.create({
    student_id: studentId,
    category: input.category,
    total_amount: totalAmount,
    is_amount_overridden: isOverridden,
    due_date: input.due_date ?? null,
    notes: input.notes ?? null,
    assigned_by: user.id,
  });

  logActivity({
    actor_id: user.id,
    entity_type: 'fee',
    entity_id: fee.id,
    action: 'fee_assigned',
    new_value: {
      student_id: studentId,
      category: fee.category,
      total_amount: fee.total_amount,
      is_amount_overridden: isOverridden,
    },
  });

  return fee;
}

export async function updateFee(
  studentId: string,
  feeId: string,
  input: UpdateFeeInput,
  user: AuthenticatedUser,
): Promise<StudentFee> {
  assertCan(user, Actions.FEES_UPDATE);

  const existing = await fetchOwnedFee(studentId, feeId);

  if (existing.status === PaymentStatus.CANCELLED) {
    throw new AppError('FEE_CANCELLED', 409, 'Cannot modify a cancelled fee');
  }

  const dbFields: Record<string, unknown> = {};

  if (input.total_amount !== undefined) {
    dbFields.total_amount = input.total_amount;
    dbFields.remaining_amount = Math.max(0, input.total_amount - existing.amount_paid);
    dbFields.is_amount_overridden = true;
  }

  if (input.due_date !== undefined) dbFields.due_date = input.due_date ?? null;
  if (input.notes !== undefined) dbFields.notes = input.notes ?? null;

  if (input.status === 'cancelled') {
    dbFields.status = PaymentStatus.CANCELLED;
  } else if (dbFields.total_amount !== undefined) {
    // Recompute status when total_amount changes
    const newTotal = input.total_amount as number;
    const today = new Date().toISOString().split('T')[0];
    if (existing.amount_paid >= newTotal) {
      dbFields.status = PaymentStatus.PAID;
    } else if (existing.due_date && existing.due_date < today) {
      dbFields.status = PaymentStatus.OVERDUE;
    } else if (existing.amount_paid > 0) {
      dbFields.status = PaymentStatus.PARTIALLY_PAID;
    } else {
      dbFields.status = PaymentStatus.PENDING;
    }
  }

  if (Object.keys(dbFields).length === 0) return existing;

  const updated = await feeRepo.update(feeId, dbFields);

  logActivity({
    actor_id: user.id,
    entity_type: 'fee',
    entity_id: feeId,
    action: 'fee_updated',
    previous_value: {
      total_amount: existing.total_amount,
      due_date: existing.due_date,
      status: existing.status,
    },
    new_value: {
      total_amount: updated.total_amount,
      due_date: updated.due_date,
      status: updated.status,
    },
  });

  return updated;
}

export async function deleteFee(
  studentId: string,
  feeId: string,
  user: AuthenticatedUser,
): Promise<void> {
  assertCan(user, Actions.FEES_DELETE);

  const existing = await fetchOwnedFee(studentId, feeId);

  await feeRepo.softDelete(feeId);

  logActivity({
    actor_id: user.id,
    entity_type: 'fee',
    entity_id: feeId,
    action: 'fee_deleted',
    previous_value: { category: existing.category, status: existing.status },
  });
}
