import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/AppError';
import { RECEIPT_NUMBER_PREFIX } from '../../config/constants';
import type { Payment, DuesFiltersInput, FeesSummary } from '@doc/shared';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CreatePaymentData {
  student_fee_id: string;
  student_id: string;
  amount: number;
  payment_method: string;
  status: string;
  payment_date: string;
  reference_number: string | null;
  notes: string | null;
  recorded_by: string;
}

export interface DuesEntry {
  student_id: string;
  student_name: string;
  counselor_id: string | null;
  counselor_name: string | null;
  summary: FeesSummary;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PAYMENT_SELECT = `
  id, student_fee_id, student_id, amount, currency, payment_method,
  status, payment_date, reference_number, receipt_number, receipt_url,
  notes, recorded_by, created_at, updated_at, deleted_at
`.trim();

// ── Receipt number generator ───────────────────────────────────────────────────

export async function generateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const { count } = await supabaseAdmin
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);

  const seq = ((count ?? 0) + 1).toString().padStart(5, '0');
  return `${RECEIPT_NUMBER_PREFIX}-${year}-${seq}`;
}

// ── Repository functions ───────────────────────────────────────────────────────

export async function findAllByFee(feeId: string): Promise<Payment[]> {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select(PAYMENT_SELECT)
    .eq('student_fee_id', feeId)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false });

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch payments');
  return (data ?? []) as unknown as Payment[];
}

export async function findById(id: string): Promise<Payment | null> {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select(PAYMENT_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch payment');
  return data as unknown as Payment | null;
}

export async function create(data: CreatePaymentData): Promise<Payment> {
  const receiptNumber = await generateReceiptNumber();

  const { data: row, error } = await supabaseAdmin
    .from('payments')
    .insert({
      student_fee_id: data.student_fee_id,
      student_id: data.student_id,
      amount: data.amount,
      currency: 'INR',
      payment_method: data.payment_method,
      status: data.status,
      payment_date: data.payment_date,
      reference_number: data.reference_number,
      receipt_number: receiptNumber,
      receipt_url: null,
      notes: data.notes,
      recorded_by: data.recorded_by,
    })
    .select(PAYMENT_SELECT)
    .single();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to record payment');
  return row as unknown as Payment;
}

export async function update(id: string, fields: Record<string, unknown>): Promise<Payment> {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select(PAYMENT_SELECT)
    .single();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to update payment');
  return data as unknown as Payment;
}

/** Sets receipt_url on a payment row after PDF is generated and uploaded. */
export async function setReceiptUrl(id: string, receiptUrl: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('payments')
    .update({ receipt_url: receiptUrl, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to save receipt URL');
}

export async function softDelete(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('payments')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to delete payment');
}

// ── Dues query ─────────────────────────────────────────────────────────────────

type RawFeeWithStudent = {
  id: string;
  student_id: string;
  category: string;
  total_amount: number;
  amount_paid: number;
  remaining_amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  student: {
    id: string;
    full_name: string;
    assigned_counselor_id: string | null;
    counselor: { employee: { full_name: string }[] } | null;
  } | null;
};

export async function findDues(filters: DuesFiltersInput): Promise<DuesEntry[]> {
  let query = supabaseAdmin
    .from('student_fees')
    .select(
      `id, student_id, category, total_amount, amount_paid, remaining_amount, currency, status, due_date,
      student:students!student_id(
        id, full_name, assigned_counselor_id,
        counselor:users!assigned_counselor_id(
          employee:employees!user_id(full_name)
        )
      )`,
    )
    .is('deleted_at', null)
    .not('status', 'in', '(paid,cancelled)');

  if (filters.overdue_only) {
    query = query.eq('status', 'overdue');
  } else if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.counselor_id) {
    query = query.eq('student.assigned_counselor_id', filters.counselor_id);
  }

  const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false });

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch dues');

  const fees = (data ?? []) as unknown as RawFeeWithStudent[];

  // Group by student and compute per-student summary
  const studentMap = new Map<
    string,
    {
      name: string;
      counselorId: string | null;
      counselorName: string | null;
      fees: RawFeeWithStudent[];
    }
  >();

  const today = new Date().toISOString().split('T')[0];

  fees.forEach((fee) => {
    if (!fee.student) return;

    if (filters.counselor_id && fee.student.assigned_counselor_id !== filters.counselor_id) return;

    if (!studentMap.has(fee.student_id)) {
      const counselorName = fee.student.counselor?.employee?.[0]?.full_name ?? null;
      studentMap.set(fee.student_id, {
        name: fee.student.full_name,
        counselorId: fee.student.assigned_counselor_id,
        counselorName,
        fees: [],
      });
    }
    studentMap.get(fee.student_id)!.fees.push(fee);
  });

  const result: DuesEntry[] = [];

  studentMap.forEach((entry, studentId) => {
    const totalAgreed = entry.fees.reduce((s, f) => s + f.total_amount, 0);
    const totalPaid = entry.fees.reduce((s, f) => s + f.amount_paid, 0);
    const totalRemaining = entry.fees.reduce((s, f) => s + f.remaining_amount, 0);
    const overdueCount = entry.fees.filter(
      (f) => f.due_date && f.due_date < today && f.status !== 'paid' && f.status !== 'cancelled',
    ).length;

    result.push({
      student_id: studentId,
      student_name: entry.name,
      counselor_id: entry.counselorId,
      counselor_name: entry.counselorName,
      summary: {
        total_agreed: totalAgreed,
        total_paid: totalPaid,
        total_remaining: totalRemaining,
        currency: entry.fees[0]?.currency ?? 'INR',
        fees_count: entry.fees.length,
        overdue_count: overdueCount,
      },
    });
  });

  return result.sort((a, b) => b.summary.total_remaining - a.summary.total_remaining);
}
