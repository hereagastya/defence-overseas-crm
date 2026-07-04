import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/AppError';
import { PaymentStatus } from '@doc/shared';
import type { StudentFee, StudentFeeWithInstallments, Payment } from '@doc/shared';

// ── Constants ──────────────────────────────────────────────────────────────────

const FEE_SELECT = `
  id, student_id, category, total_amount, amount_paid, remaining_amount,
  currency, status, due_date, is_amount_overridden, notes,
  assigned_by, created_at, updated_at, deleted_at
`.trim();

const PAYMENT_SELECT = `
  id, student_fee_id, student_id, amount, currency, payment_method,
  status, payment_date, reference_number, receipt_number, receipt_url,
  notes, recorded_by, created_at, updated_at, deleted_at
`.trim();

// ── Repository functions ───────────────────────────────────────────────────────

export async function findAll(studentId: string): Promise<StudentFeeWithInstallments[]> {
  const { data: fees, error: feeErr } = await supabaseAdmin
    .from('student_fees')
    .select(FEE_SELECT)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (feeErr) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch fees');

  if (!fees || fees.length === 0) return [];

  const feeIds = fees.map((f) => (f as unknown as StudentFee).id);

  const { data: payments, error: payErr } = await supabaseAdmin
    .from('payments')
    .select(PAYMENT_SELECT)
    .in('student_fee_id', feeIds)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false });

  if (payErr) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch installments');

  const paymentsByFee = new Map<string, Payment[]>();
  (payments ?? []).forEach((p) => {
    const pay = p as unknown as Payment;
    if (!paymentsByFee.has(pay.student_fee_id)) {
      paymentsByFee.set(pay.student_fee_id, []);
    }
    paymentsByFee.get(pay.student_fee_id)!.push(pay);
  });

  return (fees as unknown as StudentFee[]).map((fee) => {
    const installments = paymentsByFee.get(fee.id) ?? [];
    return { ...fee, installments_count: installments.length, installments };
  });
}

export async function findById(id: string): Promise<StudentFee | null> {
  const { data, error } = await supabaseAdmin
    .from('student_fees')
    .select(FEE_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch fee');
  return data as unknown as StudentFee | null;
}

export async function findByIdWithInstallments(
  id: string,
): Promise<StudentFeeWithInstallments | null> {
  const fee = await findById(id);
  if (!fee) return null;

  const { data: payments, error } = await supabaseAdmin
    .from('payments')
    .select(PAYMENT_SELECT)
    .eq('student_fee_id', id)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false });

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch installments');

  const installments = (payments ?? []) as unknown as Payment[];
  return { ...fee, installments_count: installments.length, installments };
}

/** Checks if an active (non-cancelled, non-deleted) fee for this category already exists. */
export async function findActiveByCategory(
  studentId: string,
  category: string,
): Promise<StudentFee | null> {
  const { data, error } = await supabaseAdmin
    .from('student_fees')
    .select(FEE_SELECT)
    .eq('student_id', studentId)
    .eq('category', category)
    .is('deleted_at', null)
    .neq('status', PaymentStatus.CANCELLED)
    .maybeSingle();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to check existing fee');
  return data as unknown as StudentFee | null;
}

export async function create(data: {
  student_id: string;
  category: string;
  total_amount: number;
  is_amount_overridden: boolean;
  due_date: string | null;
  notes: string | null;
  assigned_by: string;
}): Promise<StudentFee> {
  const { data: row, error } = await supabaseAdmin
    .from('student_fees')
    .insert({
      student_id: data.student_id,
      category: data.category,
      total_amount: data.total_amount,
      amount_paid: 0,
      remaining_amount: data.total_amount,
      currency: 'INR',
      status: PaymentStatus.PENDING,
      is_amount_overridden: data.is_amount_overridden,
      due_date: data.due_date,
      notes: data.notes,
      assigned_by: data.assigned_by,
    })
    .select(FEE_SELECT)
    .single();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to assign fee');
  return row as unknown as StudentFee;
}

export async function update(id: string, fields: Record<string, unknown>): Promise<StudentFee> {
  const { data, error } = await supabaseAdmin
    .from('student_fees')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select(FEE_SELECT)
    .single();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to update fee');
  return data as unknown as StudentFee;
}

/** Recalculates amount_paid / remaining_amount / status from the current active installments. */
export async function recalculateTotals(feeId: string, totalAmount: number): Promise<StudentFee> {
  const { data: payments, error } = await supabaseAdmin
    .from('payments')
    .select('amount, status')
    .eq('student_fee_id', feeId)
    .is('deleted_at', null);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to recalculate fee totals');

  const amountPaid = (payments ?? [])
    .filter((p) => p.status === 'received' || p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount as number), 0);

  const remainingAmount = Math.max(0, totalAmount - amountPaid);

  const currentFee = await findById(feeId);
  if (!currentFee) throw new AppError('FEE_NOT_FOUND', 404, 'Fee not found');

  let status: string;
  if (currentFee.status === PaymentStatus.CANCELLED) {
    status = PaymentStatus.CANCELLED;
  } else if (remainingAmount <= 0) {
    status = PaymentStatus.PAID;
  } else {
    const today = new Date().toISOString().split('T')[0];
    if (currentFee.due_date && currentFee.due_date < today) {
      status = PaymentStatus.OVERDUE;
    } else if (amountPaid > 0) {
      status = PaymentStatus.PARTIALLY_PAID;
    } else {
      status = PaymentStatus.PENDING;
    }
  }

  return update(feeId, { amount_paid: amountPaid, remaining_amount: remainingAmount, status });
}

export async function softDelete(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('student_fees')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to delete fee');
}
