import { z } from 'zod';
import { DocumentType } from '../enums';

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const uploadDocumentSchema = z.object({
  document_type: z.nativeEnum(DocumentType),
  application_id: z.string().uuid().optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
