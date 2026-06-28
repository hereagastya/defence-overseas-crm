/** Mirrors PostgreSQL enum: document_type (PRD §8) */
export enum DocumentType {
  PASSPORT = 'passport',
  TRANSCRIPTS = 'transcripts',
  OFFER_LETTER = 'offer_letter',
  ADMISSION_LETTER = 'admission_letter',
  VISA = 'visa',
  FINANCIAL = 'financial',
  NEET_SCORECARD = 'neet_scorecard',
  TENTH_MARKSHEET = 'tenth_marksheet',
  TWELFTH_MARKSHEET = 'twelfth_marksheet',
  OTHER = 'other',
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.PASSPORT]: 'Passport',
  [DocumentType.TRANSCRIPTS]: 'Transcripts',
  [DocumentType.OFFER_LETTER]: 'Offer Letter',
  [DocumentType.ADMISSION_LETTER]: 'Admission Letter',
  [DocumentType.VISA]: 'Visa',
  [DocumentType.FINANCIAL]: 'Financial Documents',
  [DocumentType.NEET_SCORECARD]: 'NEET Scorecard',
  [DocumentType.TENTH_MARKSHEET]: '10th Marksheet',
  [DocumentType.TWELFTH_MARKSHEET]: '12th Marksheet',
  [DocumentType.OTHER]: 'Other',
};
