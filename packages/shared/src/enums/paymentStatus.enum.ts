/** Mirrors PostgreSQL enum: payment_status — overall fee status (DB Update) */
export enum PaymentStatus {
  PENDING = 'pending',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'Pending',
  [PaymentStatus.PARTIALLY_PAID]: 'Partially Paid',
  [PaymentStatus.PAID]: 'Paid',
  [PaymentStatus.OVERDUE]: 'Overdue',
  [PaymentStatus.CANCELLED]: 'Cancelled',
};
