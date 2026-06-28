import { randomUUID } from 'crypto';
import path from 'path';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/AppError';
import { SIGNED_URL_EXPIRY_SECONDS } from '../config/constants';
import { BUCKETS, type BucketName } from './buckets';

/** Builds the canonical storage path for a student document.
 *  Pattern: students/{studentId}/{documentType}/{uuid}{ext} */
export function buildDocumentPath(
  studentId: string,
  documentType: string,
  originalFileName: string,
): string {
  const ext = path.extname(originalFileName).toLowerCase();
  return `students/${studentId}/${documentType}/${randomUUID()}${ext}`;
}

/** Builds the canonical storage path for a payment receipt PDF.
 *  Pattern: receipts/{studentId}/{receiptNumber}.pdf */
export function buildReceiptPath(studentId: string, receiptNumber: string): string {
  return `receipts/${studentId}/${receiptNumber}.pdf`;
}

/** Uploads a file buffer to the specified Supabase Storage bucket.
 *  Returns the storage path on success. Throws UPLOAD_FAILED on error. */
export async function uploadFile(
  bucket: BucketName,
  filePath: string,
  fileBuffer: Buffer,
  contentType: string,
): Promise<string> {
  const { error } = await supabaseAdmin.storage.from(bucket).upload(filePath, fileBuffer, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw new AppError('UPLOAD_FAILED', 500, `Storage upload failed: ${error.message}`);
  }

  return filePath;
}

/** Generates a time-limited signed URL for private file download.
 *  Defaults to SIGNED_URL_EXPIRY_SECONDS (1 hour). */
export async function getSignedUrl(
  bucket: BucketName,
  filePath: string,
  expiresIn: number = SIGNED_URL_EXPIRY_SECONDS,
): Promise<{ url: string; expiresAt: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new AppError('SIGNED_URL_FAILED', 500, 'Failed to generate download URL');
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  return { url: data.signedUrl, expiresAt };
}

/** Permanently deletes a file from storage. */
export async function deleteFile(bucket: BucketName, filePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath]);

  if (error) {
    throw new AppError('DELETE_FAILED', 500, `Storage delete failed: ${error.message}`);
  }
}

export const storageService = {
  buildDocumentPath,
  buildReceiptPath,
  uploadFile,
  getSignedUrl,
  deleteFile,
  BUCKETS,
};
