import { useRef, useState } from 'react';
import { DocumentType, DOCUMENT_TYPE_LABELS } from '@doc/shared';
import type { UniversityApplication } from '@doc/shared';
import { useUploadDocument } from './api';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const MAX_MB = 10;

interface Props {
  studentId: string;
  applications: UniversityApplication[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadDocumentDialog({ studentId, applications, open, onOpenChange }: Props) {
  const { mutate: upload, isPending } = useUploadDocument(studentId);

  const [documentType, setDocumentType] = useState<DocumentType>(DocumentType.OTHER);
  const [applicationId, setApplicationId] = useState<string>('__none__');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setDocumentType(DocumentType.OTHER);
    setApplicationId('__none__');
    setFile(null);
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFileError('');
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.size > MAX_MB * 1024 * 1024) {
      setFileError(`File exceeds ${MAX_MB} MB limit.`);
      setFile(null);
      return;
    }
    setFile(selected);
  }

  function handleSubmit() {
    if (!file) {
      setFileError('Please select a file.');
      return;
    }
    upload(
      {
        document_type: documentType,
        application_id: applicationId !== '__none__' ? applicationId : undefined,
        file,
      },
      {
        onSuccess: () => {
          toast({ title: 'Document uploaded' });
          onOpenChange(false);
          resetForm();
        },
      },
    );
  }

  function handleClose(o: boolean) {
    if (!o) resetForm();
    onOpenChange(o);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document for this student. Max file size: {MAX_MB} MB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="doc-type">Document Type</Label>
            <Select
              value={documentType}
              onValueChange={(v) => setDocumentType(v as DocumentType)}
              disabled={isPending}
            >
              <SelectTrigger id="doc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(DocumentType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {DOCUMENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {applications.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="app-id">
                Linked Application <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Select value={applicationId} onValueChange={setApplicationId} disabled={isPending}>
                <SelectTrigger id="app-id">
                  <SelectValue placeholder="Not linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not linked</SelectItem>
                  {applications.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.university_name} — {a.course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="file-input">File</Label>
            <input
              id="file-input"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              disabled={isPending}
              onChange={handleFileChange}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50 cursor-pointer"
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !file}>
            {isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
