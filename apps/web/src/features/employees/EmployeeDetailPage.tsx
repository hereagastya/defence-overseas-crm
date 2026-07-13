import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  UserCheck,
  UserX,
} from 'lucide-react';
import { UserRole } from '@doc/shared';
import type { EmployeeWithUser } from '@doc/shared';
import { useAuthStore } from '@/store/useAuthStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from '@/components/ui/use-toast';
import { useEmployee, useUpdateEmployee } from './api';
import { EditEmployeeDialog } from './EditEmployeeDialog';
import { ResetPasswordDialog } from './ResetPasswordDialog';
import { formatDateTime as formatDate } from '@/lib/format';

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

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value ?? '—'}</p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

function EmployeeHeader({
  employee,
  isAdmin,
  onEdit,
  onResetPassword,
  onStatusToggle,
}: {
  employee: EmployeeWithUser;
  isAdmin: boolean;
  onEdit: () => void;
  onResetPassword: () => void;
  onStatusToggle: () => void;
}) {
  const navigate = useNavigate();
  const initials = employee.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/employees')}
          aria-label="Back to employees"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
          {initials}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{employee.full_name}</h1>
            <Badge variant={employee.is_active ? 'default' : 'secondary'}>
              {employee.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <RoleBadge role={employee.role} />
            {employee.designation && (
              <span className="text-sm text-muted-foreground">{employee.designation}</span>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onResetPassword} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Password
          </Button>
          <Button
            variant={employee.is_active ? 'destructive' : 'default'}
            size="sm"
            onClick={onStatusToggle}
            className="gap-2"
          >
            {employee.is_active ? (
              <>
                <UserX className="h-3.5 w-3.5" />
                Deactivate
              </>
            ) : (
              <>
                <UserCheck className="h-3.5 w-3.5" />
                Activate
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const { data: employee, isLoading, isError } = useEmployee(id ?? '');
  const { mutate: toggleStatus, isPending: isToggling } = useUpdateEmployee();

  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !employee) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <UserX className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">Employee not found.</p>
      </div>
    );
  }

  function handleStatusConfirm() {
    if (!employee) return;
    const next = !employee.is_active;
    toggleStatus(
      { id: employee.id, input: { is_active: next } },
      {
        onSuccess: () => {
          toast({
            title: next ? 'Employee activated' : 'Employee deactivated',
            description: `${employee.full_name} has been ${next ? 'activated' : 'deactivated'}.`,
          });
          setStatusDialogOpen(false);
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <EmployeeHeader
        employee={employee}
        isAdmin={isAdmin}
        onEdit={() => setEditOpen(true)}
        onResetPassword={() => setResetOpen(true)}
        onStatusToggle={() => setStatusDialogOpen(true)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <InfoRow icon={Mail} label="Email" value={employee.email} />
            <InfoRow icon={Phone} label="Phone" value={employee.phone} />
            <InfoRow icon={Building2} label="Designation" value={employee.designation ?? '—'} />
            <InfoRow
              icon={UserCheck}
              label="Assigned Students"
              value={employee.assigned_students_count}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <InfoRow
              icon={UserCheck}
              label="Employee ID"
              value={<span className="font-mono text-xs">{employee.id}</span>}
            />
            <InfoRow icon={Calendar} label="Created" value={formatDate(employee.created_at)} />
            <InfoRow icon={Calendar} label="Last Updated" value={formatDate(employee.updated_at)} />
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <>
          <EditEmployeeDialog employee={employee} open={editOpen} onOpenChange={setEditOpen} />
          <ResetPasswordDialog employee={employee} open={resetOpen} onOpenChange={setResetOpen} />
        </>
      )}

      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {employee.is_active ? 'Deactivate Employee' : 'Activate Employee'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {employee.is_active
                ? `${employee.full_name} will lose access to the system immediately.`
                : `${employee.full_name} will regain access to the system.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isToggling}
              className={
                employee.is_active
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
              onClick={handleStatusConfirm}
            >
              {isToggling ? 'Updating…' : employee.is_active ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
