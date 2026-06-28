/** Supabase Storage bucket names. Each bucket must be created in the Supabase dashboard
 *  before use, configured as private with the appropriate storage policies. */
export const BUCKETS = {
  /** Student identity and application documents (passport, transcripts, visa, etc.) */
  DOCUMENTS: 'documents',
  /** Generated PDF receipts for individual payment installments */
  RECEIPTS: 'receipts',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];
