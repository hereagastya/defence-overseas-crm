import { Download, FileText, Plus, Trash2 } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, UserRole } from '@doc/shared';
import type { Document as StudentDocument } from '@doc/shared';
import { useAuthStore } from '@/store/useAuthStore';
import {
  useStudentDocuments,
  useStudentApplications,
  useDownloadDocument,
  useDeleteDocument,
} from './api';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { UploadDocumentDialog } from './UploadDocumentDialog';

interface Props {
  studentId: string;
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentCard({
  doc,
  isAdmin,
  isCounselor,
  onDownload,
  onDelete,
  isDownloading,
}: {
  doc: StudentDocument;
  isAdmin: boolean;
  isCounselor: boolean;
  onDownload: (id: string) => void;
  onDelete: (doc: StudentDocument) => void;
  isDownloading: boolean;
}) {
  const canUploadOrSee = isAdmin || isCounselor;

  return (
    <div className="flex items-start justify-between gap-4 rounded-md border p-4">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{doc.file_name}</p>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <Badge variant="secondary" className="text-xs">
              {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</span>
            <span className="text-xs text-muted-foreground">v{doc.version}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{formatDate(doc.created_at)}</p>
        </div>
      </div>

      {canUploadOrSee && (
        <div className="flex items-center gap-1 shrink-0">
          {isAdmin && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onDownload(doc.id)}
                disabled={isDownloading}
                aria-label="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(doc)}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function StudentDocuments({ studentId }: Props) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;
  const isCounselor = user?.role === UserRole.COUNSELOR;
  const canUpload = isAdmin || isCounselor;

  const { data: documents, isLoading: docsLoading } = useStudentDocuments(studentId);
  const { data: applications } = useStudentApplications(studentId);
  const { mutate: downloadDoc, isPending: isDownloading } = useDownloadDocument(studentId);
  const { mutate: deleteDoc, isPending: isDeleting } = useDeleteDocument(studentId);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudentDocument | null>(null);

  function handleDownload(id: string) {
    downloadDoc(id, {
      onSuccess: (result) => {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      },
      onError: () => {
        toast({
          title: 'Download failed',
          description: 'Could not generate download link.',
          variant: 'destructive',
        });
      },
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteDoc(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: 'Document deleted' });
        setDeleteTarget(null);
      },
    });
  }

  if (docsLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {documents?.length ?? 0} {documents?.length === 1 ? 'document' : 'documents'}
        </p>
        {canUpload && (
          <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)} className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            Upload Document
          </Button>
        )}
      </div>

      {!documents?.length ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <FileText className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground mt-1">
              Download access is restricted to administrators.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isAdmin={isAdmin}
              isCounselor={isCounselor}
              onDownload={handleDownload}
              onDelete={(d) => setDeleteTarget(d)}
              isDownloading={isDownloading}
            />
          ))}
          {!isAdmin && documents.length > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              Download access is restricted to administrators.
            </p>
          )}
        </div>
      )}

      {canUpload && (
        <UploadDocumentDialog
          studentId={studentId}
          applications={applications ?? []}
          open={uploadOpen}
          onOpenChange={setUploadOpen}
        />
      )}

      {isAdmin && (
        <AlertDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(o) => {
            if (!o) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Delete <strong>{deleteTarget?.file_name}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteConfirm}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
