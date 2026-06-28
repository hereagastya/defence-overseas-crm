import { PaymentCategory } from '../enums';

/** Standard fee amounts in INR (PRD §20.1). Admin may override per student. */
export const STANDARD_FEE_AMOUNTS: Record<PaymentCategory, number> = {
  [PaymentCategory.REGISTRATION_FEE]: 100_000,
  [PaymentCategory.IMAT_CLASSES]: 100_000,
  [PaymentCategory.IMAT_SEAT_BOOKING]: 50_000,
  [PaymentCategory.ADMISSION_PROCESS]: 250_000,
  [PaymentCategory.VISA_PROCESS]: 250_000,
};

export const TOTAL_STANDARD_PROGRAM_VALUE = Object.values(STANDARD_FEE_AMOUNTS).reduce(
  (sum, amount) => sum + amount,
  0,
); // ₹7,50,000

export const DEFAULT_CURRENCY = 'INR';
