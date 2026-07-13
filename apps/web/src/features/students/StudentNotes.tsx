import { useState } from 'react';
import { MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  useStudentNotes,
  useAddStudentNote,
  useUpdateStudentNote,
  useDeleteStudentNote,
} from './api';
import type { StudentNoteEntry } from './api';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
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

interface Props {
  studentId: string;
}

function NoteCard({
  note,
  onEdit,
  onDelete,
}: {
  note: StudentNoteEntry;
  onEdit: (note: StudentNoteEntry) => void;
  onDelete: (note: StudentNoteEntry) => void;
}) {
  return (
    <div className="rounded-md border bg-card p-4 space-y-2">
      <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {note.author_name ?? 'Unknown'} &middot; {formatDateTime(note.created_at)}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(note)}
            aria-label="Edit note"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(note)}
            aria-label="Delete note"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function StudentNotes({ studentId }: Props) {
  const { data: notes, isLoading, isError } = useStudentNotes(studentId);
  const { mutate: addNote, isPending: isAdding } = useAddStudentNote(studentId);
  const { mutate: updateNote, isPending: isUpdating } = useUpdateStudentNote(studentId);
  const { mutate: deleteNote, isPending: isDeleting } = useDeleteStudentNote(studentId);

  const [addingNote, setAddingNote] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [editTarget, setEditTarget] = useState<StudentNoteEntry | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StudentNoteEntry | null>(null);

  function handleAdd() {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    addNote(trimmed, {
      onSuccess: () => {
        toast({ title: 'Note added' });
        setNewContent('');
        setAddingNote(false);
      },
    });
  }

  function handleEditOpen(note: StudentNoteEntry) {
    setEditTarget(note);
    setEditContent(note.content);
  }

  function handleEditSave() {
    if (!editTarget) return;
    const trimmed = editContent.trim();
    if (!trimmed) return;
    updateNote(
      { noteId: editTarget.id, content: trimmed },
      {
        onSuccess: () => {
          toast({ title: 'Note updated' });
          setEditTarget(null);
        },
      },
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteNote(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: 'Note deleted' });
        setDeleteTarget(null);
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive py-4">Failed to load notes.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {notes?.length ?? 0} {notes?.length === 1 ? 'note' : 'notes'}
        </p>
        {!addingNote && (
          <Button size="sm" variant="outline" onClick={() => setAddingNote(true)} className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            Add Note
          </Button>
        )}
      </div>

      {addingNote && (
        <div className="space-y-2 rounded-md border p-3">
          <Textarea
            placeholder="Write a note…"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            disabled={isAdding}
            rows={3}
            className="resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAddingNote(false);
                setNewContent('');
              }}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={isAdding || !newContent.trim()}>
              {isAdding ? 'Saving…' : 'Save Note'}
            </Button>
          </div>
        </div>
      )}

      {!notes?.length && !addingNote ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes?.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEditOpen}
              onDelete={(n) => setDeleteTarget(n)}
            />
          ))}
        </div>
      )}

      <AlertDialog
        open={Boolean(editTarget)}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Note</AlertDialogTitle>
          </AlertDialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            disabled={isUpdating}
            rows={4}
            className="resize-none"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditSave}
              disabled={isUpdating || !editContent.trim()}
            >
              {isUpdating ? 'Saving…' : 'Save'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              This note will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
