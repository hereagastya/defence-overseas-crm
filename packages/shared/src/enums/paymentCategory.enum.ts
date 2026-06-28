/** Mirrors PostgreSQL enum: payment_category — 5 fixed fee categories (DB Update) */
export enum PaymentCategory {
  REGISTRATION_FEE = 'registration_fee',
  IMAT_CLASSES = 'imat_classes',
  IMAT_SEAT_BOOKING = 'imat_seat_booking',
  ADMISSION_PROCESS = 'admission_process',
  VISA_PROCESS = 'visa_process',
}

export const PAYMENT_CATEGORY_LABELS: Record<PaymentCategory, string> = {
  [PaymentCategory.REGISTRATION_FEE]: 'Registration Fee',
  [PaymentCategory.IMAT_CLASSES]: 'IMAT Classes',
  [PaymentCategory.IMAT_SEAT_BOOKING]: 'IMAT Seat Booking',
  [PaymentCategory.ADMISSION_PROCESS]: 'Admission Process',
  [PaymentCategory.VISA_PROCESS]: 'Visa Process + Flight + Post-Landing',
};
