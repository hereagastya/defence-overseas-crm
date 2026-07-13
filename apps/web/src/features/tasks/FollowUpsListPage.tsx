import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Filter, MoreHorizontal, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  FollowupType,
  FollowupStatus,
  FOLLOWUP_TYPE_LABELS,
  FOLLOWUP_STATUS_LABELS,
  UserRole,
} from '@doc/shared';
import type { FollowupFiltersInput } from '@doc/shared';
import { useAuthStore } from '@/store/useAuthStore';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { formatDate, formatDateTime } from '@/lib/format';
import { useFollowUps, useDeleteFollowUp, useCompleteFollowUp } from './api';
import type { FollowupWithUsers } from './api';
import { CreateFollowUpDialog } from './CreateFollowUpDialog';
import { EditFollowUpDialog } from './EditFollowUpDialog';

const PAGE_SIZE = 25;
const ALL = '__all__';

const STATUS_VARIANTS: Record<FollowupStatus, 'default' | 'secondary' | 'destructive' | 'outline'> =
  {
    [FollowupStatus.SCHEDULED]: 'outline',
    [FollowupStatus.COMPLETED]: 'default',
    [FollowupStatus.OVERDUE]: 'destructive',
    [FollowupStatus.CANCELLED]: 'secondary',
  };

function LinkedEntity({ followup }: { followup: FollowupWithUsers }) {
  if (followup.lead_id) {
    return (
      <Link to={`/leads/${followup.lead_id}`} className="text-sm text-primary hover:underline">
        Lead
      </Link>
    );
  }
  if (followup.student_id) {
    return (
      <Link
        to={`/students/${followup.student_id}`}
        className="text-sm text-primary hover:underline"
      >
        Student
      </Link>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

interface RowActionsProps {
  followup: FollowupWithUsers;
  isAdmin: boolean;
  canUpdate: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
}

function RowActions({
  followup,
  isAdmin,
  canUpdate,
  onEdit,
  onDelete,
  onComplete,
}: RowActionsProps) {
  const isDone =
    followup.status === FollowupStatus.COMPLETED || followup.status === FollowupStatus.CANCELLED;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canUpdate && <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>}
        {canUpdate && !isDone && (
          <DropdownMenuItem onClick={onComplete}>Mark Complete</DropdownMenuItem>
        )}
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FollowUpsListPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;
  const canUpdate = user?.role === UserRole.ADMIN || user?.role === UserRole.COUNSELOR;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<FollowupStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<FollowupType | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FollowupWithUsers | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FollowupWithUsers | null>(null);
  const [completeTarget, setCompleteTarget] = useState<FollowupWithUsers | null>(null);
  const [outcomeValue, setOutcomeValue] = useState('');
  const [outcomeError, setOutcomeError] = useState('');

  const filters = useMemo<FollowupFiltersInput>(
    () => ({
      page,
      limit: PAGE_SIZE,
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      overdue_only: overdueOnly,
    }),
    [page, statusFilter, typeFilter, overdueOnly],
  );

  const { data, isLoading, isError, refetch } = useFollowUps(filters);
  const { mutate: deleteFollowUp, isPending: isDeleting } = useDeleteFollowUp();
  const { mutate: completeFollowUp, isPending: isCompleting } = useCompleteFollowUp();

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const activeFilterCount = [statusFilter, typeFilter, overdueOnly].filter(Boolean).length;

  function handleCompleteConfirm() {
    if (!completeTarget) return;
    if (!outcomeValue.trim()) {
      setOutcomeError('Outcome is required.');
      return;
    }
    setOutcomeError('');
    completeFollowUp(
      { id: completeTarget.id, input: { outcome: outcomeValue.trim() } },
      {
        onSuccess: () => {
          toast({ title: 'Follow-up completed' });
          setCompleteTarget(null);
          setOutcomeValue('');
        },
      },
    );
  }

  const columns: ColumnDef<FollowupWithUsers>[] = [
    {
      id: 'type',
      header: 'Type',
      cell: (row) => (
        <Badge variant="secondary" className="text-xs capitalize">
          {FOLLOWUP_TYPE_LABELS[row.type as FollowupType] ?? row.type}
        </Badge>
      ),
    },
    {
      id: 'linked_to',
      header: 'Linked To',
      cell: (row) => <LinkedEntity followup={row} />,
    },
    {
      id: 'assigned_to',
      header: 'Assigned To',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.assigned_to_name ?? '—'}</span>
      ),
    },
    {
      id: 'scheduled_at',
      header: 'Scheduled',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{formatDateTime(row.scheduled_at)}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge
          variant={STATUS_VARIANTS[row.status as FollowupStatus] ?? 'outline'}
          className="text-xs"
        >
          {FOLLOWUP_STATUS_LABELS[row.status as FollowupStatus] ?? row.status}
        </Badge>
      ),
    },
    {
      id: 'outcome',
      header: 'Outcome',
      cell: (row) => (
        <span className="text-sm text-muted-foreground max-w-xs truncate block">
          {row.outcome ?? '—'}
        </span>
      ),
    },
    {
      id: 'created_at',
      header: 'Created',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.created_at)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12 text-right',
      cell: (row) => (
        <RowActions
          followup={row}
          isAdmin={isAdmin}
          canUpdate={canUpdate}
          onEdit={() => setEditTarget(row)}
          onDelete={() => setDeleteTarget(row)}
          onComplete={() => {
            setCompleteTarget(row);
            setOutcomeValue('');
            setOutcomeError('');
          }}
        />
      ),
    },
  ];

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Follow-ups</h1>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 py-16 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load follow-ups.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Follow-ups</h1>
          <p className="text-sm text-muted-foreground">
            Manage follow-ups across leads and students
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((p) => !p)}
            className="gap-2"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Schedule Follow-up
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 rounded-md border bg-muted/30">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <Select
              value={statusFilter || ALL}
              onValueChange={(v) => {
                setStatusFilter(v === ALL ? '' : (v as FollowupStatus));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {Object.values(FollowupStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {FOLLOWUP_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-[160px]">
            <span className="text-xs font-medium text-muted-foreground">Type</span>
            <Select
              value={typeFilter || ALL}
              onValueChange={(v) => {
                setTypeFilter(v === ALL ? '' : (v as FollowupType));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                {Object.values(FollowupType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {FOLLOWUP_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-[140px]">
            <span className="text-xs font-medium text-muted-foreground">Overdue</span>
            <Select
              value={overdueOnly ? 'yes' : 'no'}
              onValueChange={(v) => {
                setOverdueOnly(v === 'yes');
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">All follow-ups</SelectItem>
                <SelectItem value="yes">Overdue only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setStatusFilter('');
                  setTypeFilter('');
                  setOverdueOnly(false);
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      )}

      <DataTable
        data={items}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No follow-ups yet."
        pagination={pagination && pagination.total_pages > 1 ? pagination : undefined}
        onPageChange={setPage}
        actions={
          !isLoading && pagination ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>{pagination.total} total</span>
            </div>
          ) : undefined
        }
        rowKey={(row) => row.id}
      />

      <CreateFollowUpDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editTarget && (
        <EditFollowUpDialog
          followup={editTarget}
          open={Boolean(editTarget)}
          onOpenChange={(o) => {
            if (!o) setEditTarget(null);
          }}
        />
      )}

      {/* Complete follow-up dialog (requires outcome) */}
      <AlertDialog
        open={Boolean(completeTarget)}
        onOpenChange={(o) => {
          if (!o) {
            setCompleteTarget(null);
            setOutcomeValue('');
            setOutcomeError('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Follow-up</AlertDialogTitle>
            <AlertDialogDescription>
              Record the outcome of this{' '}
              {completeTarget
                ? FOLLOWUP_TYPE_LABELS[completeTarget.type as FollowupType]
                : 'follow-up'}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Textarea
              placeholder="Describe what happened…"
              value={outcomeValue}
              onChange={(e) => {
                setOutcomeValue(e.target.value);
                if (e.target.value.trim()) setOutcomeError('');
              }}
              disabled={isCompleting}
              rows={3}
              className="resize-none"
            />
            {outcomeError && <p className="text-sm text-destructive">{outcomeError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteConfirm} disabled={isCompleting}>
              {isCompleting ? 'Completing…' : 'Mark Complete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              Delete Follow-up
            </AlertDialogTitle>
            <AlertDialogDescription>
              Delete this{' '}
              {deleteTarget ? FOLLOWUP_TYPE_LABELS[deleteTarget.type as FollowupType] : 'follow-up'}{' '}
              follow-up? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                deleteFollowUp(deleteTarget.id, {
                  onSuccess: () => {
                    toast({ title: 'Follow-up deleted' });
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
    </div>
  );
}
