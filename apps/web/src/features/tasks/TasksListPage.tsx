import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardList,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  TaskPriority,
  TaskStatus,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  UserRole,
} from '@doc/shared';
import type { TaskFiltersInput } from '@doc/shared';
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
import { toast } from '@/components/ui/use-toast';
import { useTasks, useDeleteTask, useCompleteTask, useReopenTask } from './api';
import type { TaskWithUsers } from './api';
import { CreateTaskDialog } from './CreateTaskDialog';
import { EditTaskDialog } from './EditTaskDialog';

const PAGE_SIZE = 25;
const ALL = '__all__';

const PRIORITY_VARIANTS: Record<TaskPriority, 'destructive' | 'default' | 'secondary'> = {
  [TaskPriority.HIGH]: 'destructive',
  [TaskPriority.MEDIUM]: 'default',
  [TaskPriority.LOW]: 'secondary',
};

const STATUS_VARIANTS: Record<TaskStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [TaskStatus.OPEN]: 'outline',
  [TaskStatus.IN_PROGRESS]: 'secondary',
  [TaskStatus.COMPLETED]: 'default',
  [TaskStatus.CANCELLED]: 'destructive',
};

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function isDueOverdue(dueDateStr: string, status: string): boolean {
  if (status === TaskStatus.COMPLETED || status === TaskStatus.CANCELLED) return false;
  return new Date(dueDateStr) < new Date();
}

function LinkedEntity({ task }: { task: TaskWithUsers }) {
  if (task.lead_id) {
    return (
      <Link
        to={`/leads/${task.lead_id}`}
        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
      >
        Lead
      </Link>
    );
  }
  if (task.student_id) {
    return (
      <Link
        to={`/students/${task.student_id}`}
        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
      >
        Student
      </Link>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

interface RowActionsProps {
  task: TaskWithUsers;
  isAdmin: boolean;
  canUpdate: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onReopen: () => void;
}

function RowActions({
  task,
  isAdmin,
  canUpdate,
  onEdit,
  onDelete,
  onComplete,
  onReopen,
}: RowActionsProps) {
  const isDone = task.status === TaskStatus.COMPLETED;
  const isCancelled = task.status === TaskStatus.CANCELLED;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canUpdate && <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>}
        {canUpdate && !isDone && !isCancelled && (
          <DropdownMenuItem onClick={onComplete} className="gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark Complete
          </DropdownMenuItem>
        )}
        {canUpdate && isDone && (
          <DropdownMenuItem onClick={onReopen} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            Reopen
          </DropdownMenuItem>
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

export function TasksListPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;
  const canUpdate = user?.role === UserRole.ADMIN || user?.role === UserRole.COUNSELOR;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TaskWithUsers | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskWithUsers | null>(null);

  const filters = useMemo<TaskFiltersInput>(
    () => ({
      page,
      limit: PAGE_SIZE,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      overdue_only: overdueOnly,
    }),
    [page, statusFilter, priorityFilter, overdueOnly],
  );

  const { data, isLoading, isError, refetch } = useTasks(filters);
  const { mutate: deleteTask, isPending: isDeleting } = useDeleteTask();
  const { mutate: completeTask } = useCompleteTask();
  const { mutate: reopenTask } = useReopenTask();

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const activeFilterCount = [statusFilter, priorityFilter, overdueOnly].filter(Boolean).length;

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  const filteredItems = search
    ? items.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    : items;

  const columns: ColumnDef<TaskWithUsers>[] = [
    {
      id: 'title',
      header: 'Title',
      cell: (row) => (
        <div className="max-w-xs">
          <p className="text-sm font-medium truncate">{row.title}</p>
          {row.description && (
            <p className="text-xs text-muted-foreground truncate">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      id: 'linked_to',
      header: 'Linked To',
      cell: (row) => <LinkedEntity task={row} />,
    },
    {
      id: 'priority',
      header: 'Priority',
      cell: (row) => (
        <Badge
          variant={PRIORITY_VARIANTS[row.priority as TaskPriority] ?? 'secondary'}
          className="text-xs"
        >
          {TASK_PRIORITY_LABELS[row.priority as TaskPriority] ?? row.priority}
        </Badge>
      ),
    },
    {
      id: 'assigned_to',
      header: 'Assigned To',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.assigned_to_name ?? '—'}</span>
      ),
    },
    {
      id: 'due_date',
      header: 'Due Date',
      cell: (row) => {
        const overdue = isDueOverdue(row.due_date, row.status);
        return (
          <span
            className={`text-sm ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
          >
            {formatDate(row.due_date)}
            {overdue && ' (overdue)'}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status as TaskStatus] ?? 'outline'} className="text-xs">
          {TASK_STATUS_LABELS[row.status as TaskStatus] ?? row.status}
        </Badge>
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
          task={row}
          isAdmin={isAdmin}
          canUpdate={canUpdate}
          onEdit={() => setEditTarget(row)}
          onDelete={() => setDeleteTarget(row)}
          onComplete={() =>
            completeTask(row.id, {
              onSuccess: () => toast({ title: 'Task marked complete' }),
            })
          }
          onReopen={() =>
            reopenTask(row.id, {
              onSuccess: () => toast({ title: 'Task reopened' }),
            })
          }
        />
      ),
    },
  ];

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 py-16 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load tasks.</p>
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
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground">Manage tasks across leads and students</p>
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
            Add Task
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
                setStatusFilter(v === ALL ? '' : (v as TaskStatus));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {Object.values(TaskStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {TASK_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-[160px]">
            <span className="text-xs font-medium text-muted-foreground">Priority</span>
            <Select
              value={priorityFilter || ALL}
              onValueChange={(v) => {
                setPriorityFilter(v === ALL ? '' : (v as TaskPriority));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All priorities</SelectItem>
                {Object.values(TaskPriority).map((p) => (
                  <SelectItem key={p} value={p}>
                    {TASK_PRIORITY_LABELS[p]}
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
                <SelectItem value="no">All tasks</SelectItem>
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
                  setPriorityFilter('');
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
        data={filteredItems}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={search ? `No tasks match "${search}".` : 'No tasks yet.'}
        pagination={pagination && pagination.total_pages > 1 ? pagination : undefined}
        onPageChange={setPage}
        searchValue={search}
        searchPlaceholder="Search by title…"
        onSearchChange={handleSearchChange}
        actions={
          !isLoading && pagination ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5" />
              <span>{pagination.total} total</span>
            </div>
          ) : undefined
        }
        rowKey={(row) => row.id}
      />

      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editTarget && (
        <EditTaskDialog
          task={editTarget}
          open={Boolean(editTarget)}
          onOpenChange={(o) => {
            if (!o) setEditTarget(null);
          }}
        />
      )}

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
              Delete Task
            </AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                deleteTask(deleteTarget.id, {
                  onSuccess: () => {
                    toast({ title: 'Task deleted' });
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
