/** Mirrors PostgreSQL enum: payment_method (PRD §20.4, DB Update) */
export enum PaymentMethod {
  UPI = 'upi',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  CARD = 'card',
  CHEQUE = 'cheque',
  OTHER = 'other',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.UPI]: 'UPI',
  [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.CARD]: 'Card',
  [PaymentMethod.CHEQUE]: 'Cheque',
  [PaymentMethod.OTHER]: 'Other',
};
