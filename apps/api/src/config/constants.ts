// 10 MB — max upload size enforced in both the middleware and the controller
export const UPLOAD_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// 1 hour — matches the API Spec §P9 "signed URL valid 60 minutes"
export const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

// Permit only safe document types (PDF, images, Word, Excel)
export const ALLOWED_DOCUMENT_MIME_TYPES: readonly string[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// Receipt number prefix — generates codes like DO-2024-00042
export const RECEIPT_NUMBER_PREFIX = 'DO';

// Auth rate-limit window (separate from general RATE_LIMIT_MAX env var)
export const AUTH_RATE_LIMIT_MAX = 5; // per minute
export const AUTH_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const GENERAL_RATE_LIMIT_WINDOW_MS = 60 * 1000;
