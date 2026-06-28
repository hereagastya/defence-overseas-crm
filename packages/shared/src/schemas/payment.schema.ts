import { z } from 'zod';
import { PaymentCategory, PaymentMethod, InstallmentStatus } from '../enums';
import { STANDARD_FEE_AMOUNTS } from '../constants/fees';

export const assignFeeSchema = z.object({
  category: z.nativeEnum(PaymentCategory),
  total_amount: z.number().positive().optional(),
  due_date: z.string().date().optional(),
  notes: z.string().max(500).optional(),
});

export const updateFeeSchema = z.object({
  total_amount: z.number().positive().optional(),
  due_date: z.string().date().optional().nullable(),
  notes: z.string().max(500).optional(),
  status: z.literal('cancelled').optional(),
});

export const recordInstallmentSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  payment_method: z.nativeEnum(PaymentMethod),
  payment_date: z.string().date('Enter a valid date'),
  reference_number: z.string().max(100).optional(),
  status: z.nativeEnum(InstallmentStatus).optional().default(InstallmentStatus.RECEIVED),
  notes: z.string().max(500).optional(),
});

export const updateInstallmentSchema = z.object({
  amount: z.number().positive().optional(),
  payment_method: z.nativeEnum(PaymentMethod).optional(),
  payment_date: z.string().date().optional(),
  reference_number: z.string().max(100).optional().nullable(),
  status: z.nativeEnum(InstallmentStatus).optional(),
  notes: z.string().max(500).optional(),
});

export const duesFiltersSchema = z.object({
  status: z.enum(['pending', 'partially_paid', 'overdue']).optional(),
  overdue_only: z.coerce.boolean().optional().default(false),
  counselor_id: z.string().uuid().optional(),
});

export type AssignFeeInput = z.infer<typeof assignFeeSchema>;
export type UpdateFeeInput = z.infer<typeof updateFeeSchema>;
export type RecordInstallmentInput = z.infer<typeof recordInstallmentSchema>;
export type UpdateInstallmentInput = z.infer<typeof updateInstallmentSchema>;
export type DuesFiltersInput = z.infer<typeof duesFiltersSchema>;

export { STANDARD_FEE_AMOUNTS };
