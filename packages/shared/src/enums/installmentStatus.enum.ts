/** Mirrors PostgreSQL enum: installment_status — per-payment row status (DB Update) */
export enum InstallmentStatus {
  PENDING = 'pending',
  RECEIVED = 'received',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  [InstallmentStatus.PENDING]: 'Pending',
  [InstallmentStatus.RECEIVED]: 'Received',
  [InstallmentStatus.REFUNDED]: 'Refunded',
  [InstallmentStatus.CANCELLED]: 'Cancelled',
};
