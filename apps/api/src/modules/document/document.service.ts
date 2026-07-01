import { AppError } from '../../utils/AppError';
import { logActivity } from '../../database/activityLogger';
import { assertCan } from '../../permissions/policies';
import { Actions } from '../../permissions/roles';
import { UserRole } from '@doc/shared';
import type { Document, UploadDocumentInput, StudentWithCounselor } from '@doc/shared';
import type { AuthenticatedUser } from '../../types/api.types';
import * as documentRepo from './document.repository';
import { findById as findStudentById } from '../student/student.repository';
import { findById as findApplicationById } from '../application/application.repository';
import { buildDocumentPath, uploadFile, getSignedUrl } from '../../storage/storage.service';
import { BUCKETS } from '../../storage/buckets';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === UserRole.ADMIN;
}

async function assertStudentVisible(
  studentId: string,
  user: AuthenticatedUser,
): Promise<StudentWithCounselor> {
  const student = await findStudentById(studentId);
  if (!student) throw new AppError('STUDENT_NOT_FOUND', 404, 'Student not found');

  const visible =
    isAdmin(user) ||
    student.assigned_counselor_id === user.id ||
    student.assigned_counselor_id === null;

  if (!visible) throw new AppError('STUDENT_NOT_FOUND', 404, 'Student not found');
  return student;
}

function assertStudentEditable(student: StudentWithCounselor, user: AuthenticatedUser): void {
  if (isAdmin(user)) return;
  if (student.assigned_counselor_id !== user.id) {
    throw new AppError(
      'FORBIDDEN',
      403,
      'You can only upload documents for students assigned to you',
    );
  }
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function listDocuments(
  studentId: string,
  user: AuthenticatedUser,
  allVersions = false,
): Promise<Document[]> {
  assertCan(user, Actions.DOCUMENTS_READ);
  await assertStudentVisible(studentId, user);
  return documentRepo.findAll(studentId, !allVersions);
}

export async function uploadDocument(
  studentId: string,
  input: UploadDocumentInput,
  file: Express.Multer.File,
  user: AuthenticatedUser,
): Promise<Document> {
  assertCan(user, Actions.DOCUMENTS_UPLOAD);
  const student = await assertStudentVisible(studentId, user);
  assertStudentEditable(student, user);

  // Validate application_id ownership if provided
  if (input.application_id) {
    const application = await findApplicationById(input.application_id);
    if (!application || application.student_id !== studentId) {
      throw new AppError('APPLICATION_NOT_FOUND', 404, 'Application not found for this student');
    }
  }

  const applicationId = input.application_id ?? null;

  // Determine next version and mark previous versions as not latest
  const currentVersion = await documentRepo.getLatestVersion(
    studentId,
    input.document_type,
    applicationId,
  );

  if (currentVersion > 0) {
    await documentRepo.markAllNotLatest(studentId, input.document_type, applicationId);
  }

  const newVersion = currentVersion + 1;

  // Upload file to Supabase Storage
  const storagePath = buildDocumentPath(studentId, input.document_type, file.originalname);
  await uploadFile(BUCKETS.DOCUMENTS, storagePath, file.buffer, file.mimetype);

  // Create document metadata record
  const document = await documentRepo.create({
    student_id: studentId,
    application_id: applicationId,
    document_type: input.document_type,
    file_url: storagePath,
    file_name: file.originalname,
    file_size: file.size,
    mime_type: file.mimetype,
    version: newVersion,
    uploaded_by: user.id,
  });

  logActivity({
    actor_id: user.id,
    entity_type: 'document',
    entity_id: document.id,
    action: 'uploaded',
    new_value: {
      student_id: studentId,
      document_type: input.document_type,
      file_name: file.originalname,
      version: newVersion,
    },
  });

  return document;
}

export async function downloadDocument(
  studentId: string,
  documentId: string,
  user: AuthenticatedUser,
): Promise<{ url: string; expires_at: string; document: Document }> {
  assertCan(user, Actions.DOCUMENTS_DOWNLOAD);
  await assertStudentVisible(studentId, user);

  const document = await documentRepo.findById(documentId);
  if (!document || document.student_id !== studentId) {
    throw new AppError('DOCUMENT_NOT_FOUND', 404, 'Document not found');
  }

  const { url, expiresAt } = await getSignedUrl(BUCKETS.DOCUMENTS, document.file_url);

  return { url, expires_at: expiresAt, document };
}

export async function deleteDocument(
  studentId: string,
  documentId: string,
  user: AuthenticatedUser,
): Promise<void> {
  assertCan(user, Actions.DOCUMENTS_DELETE);

  const document = await documentRepo.findById(documentId);
  if (!document || document.student_id !== studentId) {
    throw new AppError('DOCUMENT_NOT_FOUND', 404, 'Document not found');
  }

  // Soft-delete the DB record only; storage file is retained for audit trail
  await documentRepo.softDelete(documentId);

  logActivity({
    actor_id: user.id,
    entity_type: 'document',
    entity_id: documentId,
    action: 'deleted',
    previous_value: {
      document_type: document.document_type,
      file_name: document.file_name,
      version: document.version,
    },
  });
}
