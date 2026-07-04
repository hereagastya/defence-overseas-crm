import { AppError } from '../../utils/AppError';
import { logActivity } from '../../database/activityLogger';
import { assertCan } from '../../permissions/policies';
import { Actions } from '../../permissions/roles';
import { UserRole, PaymentStatus } from '@doc/shared';
import type {
  Payment,
  StudentFee,
  StudentWithCounselor,
  RecordInstallmentInput,
  UpdateInstallmentInput,
  DuesFiltersInput,
} from '@doc/shared';
import type { AuthenticatedUser } from '../../types/api.types';
import * as paymentRepo from './payment.repository';
import type { DuesEntry } from './payment.repository';
import * as feeRepo from '../fee/fee.repository';
import { findById as findStudentById } from '../student/student.repository';
import { generateReceiptPdf } from '../../utils/receiptPdf';
import { uploadFile, getSignedUrl } from '../../storage/storage.service';
import { buildReceiptPath } from '../../storage/storage.service';
import { BUCKETS } from '../../storage/buckets';

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

async function fetchOwnedFee(studentId: string, feeId: string): Promise<StudentFee> {
  const fee = await feeRepo.findById(feeId);
  if (!fee || fee.student_id !== studentId) {
    throw new AppError('FEE_NOT_FOUND', 404, 'Fee not found');
  }
  return fee;
}

async function fetchOwnedPayment(feeId: string, paymentId: string): Promise<Payment> {
  const payment = await paymentRepo.findById(paymentId);
  if (!payment || payment.student_fee_id !== feeId) {
    throw new AppError('PAYMENT_NOT_FOUND', 404, 'Payment not found');
  }
  return payment;
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function listPayments(
  studentId: string,
  feeId: string,
  user: AuthenticatedUser,
): Promise<Payment[]> {
  assertCan(user, Actions.PAYMENTS_READ);
  await assertStudentVisible(studentId, user);
  await fetchOwnedFee(studentId, feeId);
  return paymentRepo.findAllByFee(feeId);
}

export async function recordPayment(
  studentId: string,
  feeId: string,
  input: RecordInstallmentInput,
  user: AuthenticatedUser,
): Promise<Payment> {
  assertCan(user, Actions.PAYMENTS_CREATE);
  await assertStudentVisible(studentId, user);

  const fee = await fetchOwnedFee(studentId, feeId);

  if (fee.status === PaymentStatus.CANCELLED) {
    throw new AppError('FEE_CANCELLED', 409, 'Cannot record payment on a cancelled fee');
  }

  if (fee.status === PaymentStatus.PAID) {
    throw new AppError('FEE_ALREADY_PAID', 409, 'This fee is already fully paid');
  }

  const payment = await paymentRepo.create({
    student_fee_id: feeId,
    student_id: studentId,
    amount: input.amount,
    payment_method: input.payment_method,
    status: input.status,
    payment_date: input.payment_date,
    reference_number: input.reference_number ?? null,
    notes: input.notes ?? null,
    recorded_by: user.id,
  });

  // Recalculate fee totals after recording
  await feeRepo.recalculateTotals(feeId, fee.total_amount);

  logActivity({
    actor_id: user.id,
    entity_type: 'payment',
    entity_id: payment.id,
    action: 'payment_recorded',
    new_value: {
      student_id: studentId,
      fee_id: feeId,
      amount: input.amount,
      payment_method: input.payment_method,
      receipt_number: payment.receipt_number,
    },
  });

  return payment;
}

export async function updatePayment(
  studentId: string,
  feeId: string,
  paymentId: string,
  input: UpdateInstallmentInput,
  user: AuthenticatedUser,
): Promise<Payment> {
  assertCan(user, Actions.PAYMENTS_UPDATE);
  await assertStudentVisible(studentId, user);

  const fee = await fetchOwnedFee(studentId, feeId);
  const existing = await fetchOwnedPayment(feeId, paymentId);

  const dbFields: Record<string, unknown> = {};
  if (input.amount !== undefined) dbFields.amount = input.amount;
  if (input.payment_method !== undefined) dbFields.payment_method = input.payment_method;
  if (input.payment_date !== undefined) dbFields.payment_date = input.payment_date;
  if (input.reference_number !== undefined)
    dbFields.reference_number = input.reference_number ?? null;
  if (input.status !== undefined) dbFields.status = input.status;
  if (input.notes !== undefined) dbFields.notes = input.notes ?? null;

  // If amount or status changed, invalidate the cached receipt
  if (dbFields.amount !== undefined || dbFields.status !== undefined) {
    dbFields.receipt_url = null;
  }

  if (Object.keys(dbFields).length === 0) return existing;

  const updated = await paymentRepo.update(paymentId, dbFields);

  // Recalculate fee totals if the payment amount changed
  if (dbFields.amount !== undefined || dbFields.status !== undefined) {
    await feeRepo.recalculateTotals(feeId, fee.total_amount);
  }

  logActivity({
    actor_id: user.id,
    entity_type: 'payment',
    entity_id: paymentId,
    action: 'payment_updated',
    previous_value: { amount: existing.amount, status: existing.status },
    new_value: { amount: updated.amount, status: updated.status },
  });

  return updated;
}

export async function deletePayment(
  studentId: string,
  feeId: string,
  paymentId: string,
  user: AuthenticatedUser,
): Promise<void> {
  assertCan(user, Actions.PAYMENTS_DELETE);
  await assertStudentVisible(studentId, user);

  const fee = await fetchOwnedFee(studentId, feeId);
  const existing = await fetchOwnedPayment(feeId, paymentId);

  await paymentRepo.softDelete(paymentId);

  // Recalculate fee totals after removing this payment
  await feeRepo.recalculateTotals(feeId, fee.total_amount);

  logActivity({
    actor_id: user.id,
    entity_type: 'payment',
    entity_id: paymentId,
    action: 'payment_deleted',
    previous_value: {
      amount: existing.amount,
      payment_method: existing.payment_method,
      receipt_number: existing.receipt_number,
    },
  });
}

export async function getReceipt(
  studentId: string,
  feeId: string,
  paymentId: string,
  user: AuthenticatedUser,
): Promise<{ url: string; expires_at: string; receipt_number: string }> {
  assertCan(user, Actions.PAYMENTS_RECEIPT);
  const student = await assertStudentVisible(studentId, user);

  const fee = await fetchOwnedFee(studentId, feeId);
  const payment = await fetchOwnedPayment(feeId, paymentId);

  let storagePath = payment.receipt_url;

  // Lazy PDF generation: generate + upload on first request
  if (!storagePath) {
    const pdfBuffer = await generateReceiptPdf(payment, fee, student.full_name);
    storagePath = buildReceiptPath(studentId, payment.receipt_number);
    await uploadFile(BUCKETS.RECEIPTS, storagePath, pdfBuffer, 'application/pdf');
    await paymentRepo.setReceiptUrl(paymentId, storagePath);
  }

  const { url, expiresAt } = await getSignedUrl(BUCKETS.RECEIPTS, storagePath);

  return { url, expires_at: expiresAt, receipt_number: payment.receipt_number };
}

export async function getDues(
  filters: DuesFiltersInput,
  user: AuthenticatedUser,
): Promise<DuesEntry[]> {
  assertCan(user, Actions.FEES_READ);
  return paymentRepo.findDues(filters);
}
