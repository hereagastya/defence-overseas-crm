import type { PaymentCategory, PaymentStatus, PaymentMethod, InstallmentStatus } from '../enums';

export interface StudentFee {
  id: string;
  student_id: string;
  category: PaymentCategory;
  total_amount: number;
  amount_paid: number;
  remaining_amount: number;
  currency: string;
  status: PaymentStatus;
  due_date: string | null;
  is_amount_overridden: boolean;
  notes: string | null;
  assigned_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StudentFeeWithInstallments extends StudentFee {
  installments_count: number;
  installments: Payment[];
}

export interface Payment {
  id: string;
  student_fee_id: string;
  student_id: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  status: InstallmentStatus;
  payment_date: string;
  reference_number: string | null;
  receipt_number: string;
  receipt_url: string | null;
  notes: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FeesSummary {
  total_agreed: number;
  total_paid: number;
  total_remaining: number;
  currency: string;
  fees_count: number;
  overdue_count: number;
}
