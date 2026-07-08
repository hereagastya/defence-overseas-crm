import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Plus, UserX2, Users2 } from 'lucide-react';
import { UserRole } from '@doc/shared';
import type { EmployeeWithUser, Pagination } from '@doc/shared';
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
import { toast } from '@/components/ui/use-toast';
import { useEmployees, useUpdateEmployee } from './api';
import { CreateEmployeeDialog } from './CreateEmployeeDialog';
import { EditEmployeeDialog } from './EditEmployeeDialog';
import { ResetPasswordDialog } from './ResetPasswordDialog';

const PAGE_SIZE = 10;

type SortableKey = 'full_name' | 'email' | 'role' | 'created_at';

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function RoleBadge({ role }: { role: UserRole }) {
  const variant =
    role === UserRole.ADMIN
      ? ('destructive' as const)
      : role === UserRole.COUNSELOR
        ? ('default' as const)
        : ('secondary' as const);
  const label =
    role === UserRole.PRE_COUNSELOR
      ? 'Pre-Counselor'
      : role.charAt(0).toUpperCase() + role.slice(1);
  return <Badge variant={variant}>{label}</Badge>;
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Active' : 'Inactive'}</Badge>
  );
}

interface RowActionsProps {
  employee: EmployeeWithUser;
  isAdmin: boolean;
  onEdit: () => void;
  onStatusToggle: () => void;
  onResetPassword: () => void;
}

function RowActions({
  employee,
  isAdmin,
  onEdit,
  onStatusToggle,
  onResetPassword,
}: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/employees/${employee.id}`}>View</Link>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={onStatusToggle}>
              {employee.is_active ? 'Deactivate' : 'Activate'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onResetPassword}
              className="text-destructive focus:text-destructive"
            >
              Reset Password
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function sortEmployees(
  list: EmployeeWithUser[],
  sortBy: SortableKey,
  sortOrder: 'asc' | 'desc',
): EmployeeWithUser[] {
  return [...list].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    if (sortBy === 'created_at') {
      aVal = new Date(a.created_at).getTime();
      bVal = new Date(b.created_at).getTime();
    } else {
      aVal = String(a[sortBy]).toLowerCase();
      bVal = String(b[sortBy]).toLowerCase();
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}

export function EmployeeListPage() {
  const { data: employees, isLoading, isError } = useEmployees();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;

  const { mutate: toggleStatus, isPending: isToggling } = useUpdateEmployee();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortableKey>('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmployeeWithUser | null>(null);
  const [statusTarget, setStatusTarget] = useState<EmployeeWithUser | null>(null);
  const [resetTarget, setResetTarget] = useState<EmployeeWithUser | null>(null);

  const filtered = useMemo(() => {
    if (!employees) return [];
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.full_name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q),
    );
  }, [employees, search]);

  const sorted = useMemo(
    () => sortEmployees(filtered, sortBy, sortOrder),
    [filtered, sortBy, sortOrder],
  );

  const paginated = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page],
  );

  const pagination: Pagination = {
    page,
    limit: PAGE_SIZE,
    total: sorted.length,
    total_pages: Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)),
  };

  function handleSortChange(id: string, order: 'asc' | 'desc') {
    setSortBy(id as SortableKey);
    setSortOrder(order);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  const columns: ColumnDef<EmployeeWithUser>[] = [
    {
      id: 'id',
      header: 'Employee ID',
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.id.slice(0, 8)}&hellip;
        </span>
      ),
    },
    {
      id: 'full_name',
      header: 'Full Name',
      sortable: true,
      cell: (row) => (
        <Link to={`/employees/${row.id}`} className="font-medium hover:underline">
          {row.full_name}
        </Link>
      ),
    },
    {
      id: 'email',
      header: 'Email',
      accessorKey: 'email',
      sortable: true,
    },
    {
      id: 'role',
      header: 'Role',
      sortable: true,
      cell: (row) => <RoleBadge role={row.role} />,
    },
    {
      id: 'is_active',
      header: 'Status',
      cell: (row) => <StatusBadge isActive={row.is_active} />,
    },
    {
      id: 'created_at',
      header: 'Created',
      sortable: true,
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.created_at)}</span>,
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12 text-right',
      cell: (row) => (
        <RowActions
          employee={row}
          isAdmin={isAdmin}
          onEdit={() => setEditTarget(row)}
          onStatusToggle={() => setStatusTarget(row)}
          onResetPassword={() => setResetTarget(row)}
        />
      ),
    },
  ];

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Employees</h1>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 py-16 text-center">
          <UserX2 className="mb-3 h-10 w-10 text-destructive/60" />
          <p className="text-sm font-medium text-destructive">Failed to load employees.</p>
          <p className="mt-1 text-xs text-muted-foreground">Check your connection and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground">Manage team members and their access</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        )}
      </div>

      <DataTable
        data={paginated}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={search ? `No employees match "${search}".` : 'No employees yet.'}
        pagination={pagination.total_pages > 1 ? pagination : undefined}
        onPageChange={setPage}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        searchValue={search}
        searchPlaceholder="Search by name, email, or role…"
        onSearchChange={handleSearchChange}
        actions={
          !isLoading && employees && employees.length > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users2 className="h-3.5 w-3.5" />
              <span>{employees.length} total</span>
            </div>
          ) : undefined
        }
        rowKey={(row) => row.id}
      />

      {isAdmin && (
        <>
          <CreateEmployeeDialog open={createOpen} onOpenChange={setCreateOpen} />
          {editTarget && (
            <EditEmployeeDialog
              employee={editTarget}
              open={true}
              onOpenChange={(open) => {
                if (!open) setEditTarget(null);
              }}
            />
          )}
          {resetTarget && (
            <ResetPasswordDialog
              employee={resetTarget}
              open={true}
              onOpenChange={(open) => {
                if (!open) setResetTarget(null);
              }}
            />
          )}
        </>
      )}

      <AlertDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTarget?.is_active ? 'Deactivate Employee' : 'Activate Employee'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget?.is_active
                ? `${statusTarget.full_name} will lose access to the system immediately.`
                : `${statusTarget?.full_name} will regain access to the system.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isToggling}
              className={
                statusTarget?.is_active
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
              onClick={() => {
                if (!statusTarget) return;
                const next = !statusTarget.is_active;
                toggleStatus(
                  { id: statusTarget.id, input: { is_active: next } },
                  {
                    onSuccess: () => {
                      toast({
                        title: next ? 'Employee activated' : 'Employee deactivated',
                        description: `${statusTarget.full_name} has been ${next ? 'activated' : 'deactivated'}.`,
                      });
                      setStatusTarget(null);
                    },
                  },
                );
              }}
            >
              {isToggling ? 'Updating…' : statusTarget?.is_active ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
