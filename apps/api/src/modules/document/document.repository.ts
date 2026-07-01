import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/AppError';
import type { Document } from '@doc/shared';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CreateDocumentData {
  student_id: string;
  application_id: string | null;
  document_type: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  version: number;
  uploaded_by: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DOCUMENT_SELECT = `
  id, student_id, application_id, document_type, file_url,
  file_name, file_size, mime_type, version, is_latest,
  uploaded_by, created_at, updated_at, deleted_at
`.trim();

// ── Repository functions ───────────────────────────────────────────────────────

export async function findAll(studentId: string, latestOnly = true): Promise<Document[]> {
  let query = supabaseAdmin
    .from('documents')
    .select(DOCUMENT_SELECT)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('document_type', { ascending: true })
    .order('version', { ascending: false });

  if (latestOnly) {
    query = query.eq('is_latest', true);
  }

  const { data, error } = await query;

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch documents');
  return (data ?? []) as unknown as Document[];
}

export async function findById(id: string): Promise<Document | null> {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select(DOCUMENT_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch document');
  return data as unknown as Document | null;
}

/** Returns the highest version number for a (student, type, application) combination, or 0 if none. */
export async function getLatestVersion(
  studentId: string,
  documentType: string,
  applicationId: string | null,
): Promise<number> {
  let query = supabaseAdmin
    .from('documents')
    .select('version')
    .eq('student_id', studentId)
    .eq('document_type', documentType)
    .is('deleted_at', null);

  if (applicationId !== null) {
    query = query.eq('application_id', applicationId);
  } else {
    query = query.is('application_id', null);
  }

  const { data, error } = await query.order('version', { ascending: false }).limit(1);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to check document version');
  return (data?.[0] as { version: number } | undefined)?.version ?? 0;
}

/** Marks all non-deleted documents of a given (student, type, application) as not latest. */
export async function markAllNotLatest(
  studentId: string,
  documentType: string,
  applicationId: string | null,
): Promise<void> {
  let query = supabaseAdmin
    .from('documents')
    .update({ is_latest: false, updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('document_type', documentType)
    .is('deleted_at', null);

  if (applicationId !== null) {
    query = query.eq('application_id', applicationId);
  } else {
    query = query.is('application_id', null);
  }

  const { error } = await query;
  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to update document versions');
}

export async function create(data: CreateDocumentData): Promise<Document> {
  const { data: row, error } = await supabaseAdmin
    .from('documents')
    .insert({
      student_id: data.student_id,
      application_id: data.application_id,
      document_type: data.document_type,
      file_url: data.file_url,
      file_name: data.file_name,
      file_size: data.file_size,
      mime_type: data.mime_type,
      version: data.version,
      is_latest: true,
      uploaded_by: data.uploaded_by,
    })
    .select(DOCUMENT_SELECT)
    .single();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to save document record');
  return row as unknown as Document;
}

export async function softDelete(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('documents')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to delete document');
}
