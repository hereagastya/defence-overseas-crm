import { useState } from 'react';
import { MoreHorizontal, Plus, LayoutList } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { ApplicationStatus, APPLICATION_STATUS_LABELS, UserRole } from '@doc/shared';
import type { UniversityApplication } from '@doc/shared';
import { useAuthStore } from '@/store/useAuthStore';
import { useStudentApplications, useDeleteApplication } from './api';
import { DataTable } from '@/components/DataTable';
import type { ColumnDef } from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { toast } from '@/components/ui/use-toast';
import { CreateApplicationDialog } from './CreateApplicationDialog';
import { EditApplicationDialog } from './EditApplicationDialog';

interface Props {
  studentId: string;
}

const STATUS_VARIANTS: Record<
  ApplicationStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [ApplicationStatus.DRAFT]: 'outline',
  [ApplicationStatus.SUBMITTED]: 'secondary',
  [ApplicationStatus.UNDER_REVIEW]: 'default',
  [ApplicationStatus.OFFER_RECEIVED]: 'default',
  [ApplicationStatus.OFFER_ACCEPTED]: 'default',
  [ApplicationStatus.OFFER_REJECTED]: 'destructive',
  [ApplicationStatus.WITHDRAWN]: 'destructive',
};

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status] ?? 'outline'} className="text-xs whitespace-nowrap">
      {APPLICATION_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function RowActions({
  isAdmin,
  canEdit,
  onEdit,
  onDelete,
}: {
  isAdmin: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit && <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>}
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </>
        )}
        {!canEdit && !isAdmin && (
          <DropdownMenuItem disabled className="text-muted-foreground">
            No actions available
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function StudentApplications({ studentId }: Props) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;
  const isCounselor = user?.role === UserRole.COUNSELOR;
  const canEdit = isAdmin || isCounselor;

  const { data: applications, isLoading, isError } = useStudentApplications(studentId);
  const { mutate: deleteApplication, isPending: isDeleting } = useDeleteApplication(studentId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UniversityApplication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UniversityApplication | null>(null);

  const columns: ColumnDef<UniversityApplication>[] = [
    {
      id: 'university_name',
      header: 'University',
      cell: (row) => <span className="font-medium">{row.university_name}</span>,
    },
    {
      id: 'course',
      header: 'Course',
      accessorKey: 'course',
    },
    {
      id: 'country',
      header: 'Country',
      accessorKey: 'country',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status as ApplicationStatus} />,
    },
    {
      id: 'applied_at',
      header: 'Applied Date',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.applied_at)}</span>,
    },
    {
      id: 'offer_received_at',
      header: 'Offer Received',
      cell: (row) => (
        <span className="text-muted-foreground">{formatDate(row.offer_received_at)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12 text-right',
      cell: (row) => (
        <RowActions
          isAdmin={isAdmin}
          canEdit={canEdit}
          onEdit={() => setEditTarget(row)}
          onDelete={() => setDeleteTarget(row)}
        />
      ),
    },
  ];

  if (isError) {
    return <p className="text-sm text-destructive py-4">Failed to load applications.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {applications?.length ?? 0} {applications?.length === 1 ? 'application' : 'applications'}
        </p>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            Add Application
          </Button>
        )}
      </div>

      <DataTable
        data={applications ?? []}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No applications yet."
        actions={
          !isLoading && (applications?.length ?? 0) > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LayoutList className="h-3.5 w-3.5" />
              <span>{applications?.length} total</span>
            </div>
          ) : undefined
        }
        rowKey={(row) => row.id}
      />

      {canEdit && (
        <CreateApplicationDialog
          studentId={studentId}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      )}

      {editTarget && canEdit && (
        <EditApplicationDialog
          studentId={studentId}
          application={editTarget}
          open={Boolean(editTarget)}
          onOpenChange={(o) => {
            if (!o) setEditTarget(null);
          }}
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
              <AlertDialogTitle>Delete Application</AlertDialogTitle>
              <AlertDialogDescription>
                Delete the application for <strong>{deleteTarget?.university_name}</strong>? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (!deleteTarget) return;
                  deleteApplication(deleteTarget.id, {
                    onSuccess: () => {
                      toast({
                        title: 'Application deleted',
                        description: `${deleteTarget.university_name} has been removed.`,
                      });
                      setDeleteTarget(null);
                    },
                  });
                }}
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
