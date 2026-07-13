import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CreditCard,
  MoreHorizontal,
  Plus,
  Receipt,
  Wallet,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/format';
import {
  PaymentStatus,
  PAYMENT_STATUS_LABELS,
  PAYMENT_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  INSTALLMENT_STATUS_LABELS,
  InstallmentStatus,
  UserRole,
} from '@doc/shared';
import type { StudentFeeWithInstallments, Payment } from '@doc/shared';
import { useAuthStore } from '@/store/useAuthStore';
import {
  useStudentFees,
  useDeleteFee,
  useUpdateFee,
  useDeletePayment,
  useDownloadReceipt,
} from './api';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { AssignFeeDialog } from './AssignFeeDialog';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { EditPaymentDialog } from './EditPaymentDialog';

interface Props {
  studentId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysOverdue(dueDateStr: string | null): number | null {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

const FEE_STATUS_VARIANTS: Record<
  PaymentStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [PaymentStatus.PENDING]: 'outline',
  [PaymentStatus.PARTIALLY_PAID]: 'secondary',
  [PaymentStatus.PAID]: 'default',
  [PaymentStatus.OVERDUE]: 'destructive',
  [PaymentStatus.CANCELLED]: 'outline',
};

const INSTALLMENT_STATUS_VARIANTS: Record<
  InstallmentStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [InstallmentStatus.PENDING]: 'outline',
  [InstallmentStatus.RECEIVED]: 'default',
  [InstallmentStatus.REFUNDED]: 'secondary',
  [InstallmentStatus.CANCELLED]: 'outline',
};

function FeeStatusBadge({ status }: { status: string }) {
  const s = status as PaymentStatus;
  return (
    <Badge
      variant={FEE_STATUS_VARIANTS[s] ?? 'outline'}
      className={s === PaymentStatus.CANCELLED ? 'text-muted-foreground' : undefined}
    >
      {PAYMENT_STATUS_LABELS[s] ?? s}
    </Badge>
  );
}

function InstallmentStatusBadge({ status }: { status: string }) {
  const s = status as InstallmentStatus;
  return (
    <Badge
      variant={INSTALLMENT_STATUS_VARIANTS[s] ?? 'outline'}
      className={`text-xs ${s === InstallmentStatus.CANCELLED ? 'text-muted-foreground' : ''}`}
    >
      {INSTALLMENT_STATUS_LABELS[s] ?? s}
    </Badge>
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function FeesSummaryBar({ fees }: { fees: StudentFeeWithInstallments[] }) {
  const active = fees.filter((f) => f.status !== PaymentStatus.CANCELLED);
  const total = active.reduce((s, f) => s + f.total_amount, 0);
  const paid = active.reduce((s, f) => s + f.amount_paid, 0);
  const remaining = active.reduce((s, f) => s + f.remaining_amount, 0);
  const currency = fees[0]?.currency ?? 'INR';

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: 'Total Assigned', value: total, icon: Wallet },
        { label: 'Total Paid', value: paid, icon: CreditCard },
        { label: 'Outstanding', value: remaining, icon: Receipt },
      ].map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex flex-col gap-1 rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            {label}
          </div>
          <p className="text-base font-semibold tabular-nums">{formatCurrency(value, currency)}</p>
        </div>
      ))}
    </div>
  );
}

// ── Payment row ───────────────────────────────────────────────────────────────

function PaymentRow({
  payment,
  studentId,
  feeId,
  isAdmin,
  onEdit,
  onDelete,
}: {
  payment: Payment;
  studentId: string;
  feeId: string;
  isAdmin: boolean;
  onEdit: (p: Payment) => void;
  onDelete: (p: Payment) => void;
}) {
  const { mutate: downloadReceipt, isPending: isDownloading } = useDownloadReceipt(
    studentId,
    feeId,
  );

  function handleReceipt() {
    downloadReceipt(payment.id, {
      onSuccess: (result) => {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      },
      onError: () => {
        toast({
          title: 'Receipt unavailable',
          description: 'Could not generate receipt.',
          variant: 'destructive',
        });
      },
    });
  }

  return (
    <tr className="border-b last:border-0 text-sm">
      <td className="py-2 px-3 text-muted-foreground">{formatDate(payment.payment_date)}</td>
      <td className="py-2 px-3 font-medium tabular-nums">{formatCurrency(payment.amount)}</td>
      <td className="py-2 px-3">
        {PAYMENT_METHOD_LABELS[payment.payment_method as keyof typeof PAYMENT_METHOD_LABELS] ??
          payment.payment_method}
      </td>
      <td className="py-2 px-3 text-muted-foreground">{payment.reference_number ?? '—'}</td>
      <td className="py-2 px-3">{payment.receipt_number}</td>
      <td className="py-2 px-3">
        <InstallmentStatusBadge status={payment.status} />
      </td>
      <td className="py-2 px-3 text-right">
        {isAdmin && (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleReceipt}
              disabled={isDownloading}
            >
              <Receipt className="mr-1 h-3 w-3" />
              Receipt
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(payment)}>Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(payment)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </td>
    </tr>
  );
}

// ── Fee card ──────────────────────────────────────────────────────────────────

function FeeCard({
  fee,
  studentId,
  isAdmin,
  canAssign,
}: {
  fee: StudentFeeWithInstallments;
  studentId: string;
  isAdmin: boolean;
  canAssign: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [deletePaymentTarget, setDeletePaymentTarget] = useState<Payment | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { mutate: updateFee, isPending: isCancelling } = useUpdateFee(studentId);
  const { mutate: deleteFee, isPending: isDeletingFee } = useDeleteFee(studentId);
  const { mutate: deletePayment, isPending: isDeletingPayment } = useDeletePayment(
    studentId,
    fee.id,
  );

  const overdueDays = daysOverdue(fee.due_date);
  const isCancelled = fee.status === PaymentStatus.CANCELLED;

  function handleCancelFee() {
    updateFee(
      { feeId: fee.id, input: { status: 'cancelled' } },
      {
        onSuccess: () => {
          toast({ title: 'Fee cancelled' });
          setConfirmCancel(false);
        },
      },
    );
  }

  function handleDeleteFee() {
    deleteFee(fee.id, {
      onSuccess: () => {
        toast({ title: 'Fee deleted' });
        setConfirmDelete(false);
      },
    });
  }

  function handleDeletePayment() {
    if (!deletePaymentTarget) return;
    deletePayment(deletePaymentTarget.id, {
      onSuccess: () => {
        toast({ title: 'Payment deleted' });
        setDeletePaymentTarget(null);
      },
    });
  }

  return (
    <>
      <Card className={isCancelled ? 'opacity-60' : undefined}>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-start justify-between gap-3">
            <button
              className="flex items-center gap-2 text-left"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-semibold leading-tight">
                  {PAYMENT_CATEGORY_LABELS[fee.category] ?? fee.category}
                </p>
                {fee.due_date && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Due {formatDate(fee.due_date)}
                    {overdueDays !== null && (
                      <span className="text-destructive ml-1">({overdueDays}d overdue)</span>
                    )}
                  </p>
                )}
              </div>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <FeeStatusBadge status={fee.status} />
              {isAdmin && !isCancelled && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => setRecordOpen(true)}>
                        Record Payment
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirmCancel(true)}
                    >
                      Cancel Fee
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete Fee
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {!isAdmin && canAssign && !isCancelled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setRecordOpen(true)}
                  disabled
                  title="Only admins can record payments"
                >
                  Record
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(fee.total_amount, fee.currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="font-medium tabular-nums text-green-600 dark:text-green-400">
                {formatCurrency(fee.amount_paid, fee.currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p
                className={`font-medium tabular-nums ${
                  fee.remaining_amount > 0 ? 'text-orange-600 dark:text-orange-400' : ''
                }`}
              >
                {formatCurrency(fee.remaining_amount, fee.currency)}
              </p>
            </div>
          </div>

          {fee.notes && (
            <p className="mt-2 text-xs text-muted-foreground border-t pt-2">{fee.notes}</p>
          )}
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0 px-4 pb-4">
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Payment History ({fee.installments_count})
              </p>
              {fee.installments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No payments recorded yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">
                          Amount
                        </th>
                        <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">
                          Method
                        </th>
                        <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">
                          Reference
                        </th>
                        <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">
                          Receipt #
                        </th>
                        <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fee.installments.map((p) => (
                        <PaymentRow
                          key={p.id}
                          payment={p}
                          studentId={studentId}
                          feeId={fee.id}
                          isAdmin={isAdmin}
                          onEdit={(payment) => setEditPayment(payment)}
                          onDelete={(payment) => setDeletePaymentTarget(payment)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {isAdmin && !isCancelled && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 gap-2"
                  onClick={() => setRecordOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Record Payment
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {isAdmin && (
        <RecordPaymentDialog
          studentId={studentId}
          feeId={fee.id}
          open={recordOpen}
          onOpenChange={setRecordOpen}
        />
      )}

      {isAdmin && editPayment && (
        <EditPaymentDialog
          studentId={studentId}
          feeId={fee.id}
          payment={editPayment}
          open={Boolean(editPayment)}
          onOpenChange={(o) => {
            if (!o) setEditPayment(null);
          }}
        />
      )}

      <AlertDialog
        open={Boolean(deletePaymentTarget)}
        onOpenChange={(o) => {
          if (!o) setDeletePaymentTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Delete payment of{' '}
              <strong>
                {deletePaymentTarget ? formatCurrency(deletePaymentTarget.amount) : ''}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingPayment}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingPayment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeletePayment}
            >
              {isDeletingPayment ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Fee</AlertDialogTitle>
            <AlertDialogDescription>
              Cancel the <strong>{PAYMENT_CATEGORY_LABELS[fee.category]}</strong> fee? This will
              stop further payments from being recorded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Back</AlertDialogCancel>
            <AlertDialogAction
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancelFee}
            >
              {isCancelling ? 'Cancelling…' : 'Cancel Fee'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fee</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete the <strong>{PAYMENT_CATEGORY_LABELS[fee.category]}</strong> fee
              and all its payment history? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingFee}>Back</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingFee}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteFee}
            >
              {isDeletingFee ? 'Deleting…' : 'Delete Fee'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StudentPayments({ studentId }: Props) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;
  const isCounselor = user?.role === UserRole.COUNSELOR;
  const canAssign = isAdmin || isCounselor;

  const { data: fees, isLoading, isError } = useStudentFees(studentId);
  const [assignOpen, setAssignOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive py-4">Failed to load payment information.</p>;
  }

  const hasFees = (fees?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      {hasFees && <FeesSummaryBar fees={fees!} />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {fees?.length ?? 0} {fees?.length === 1 ? 'fee' : 'fees'} assigned
        </p>
        {canAssign && (
          <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)} className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            Assign Fee
          </Button>
        )}
      </div>

      {!hasFees ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Wallet className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No fees assigned yet.</p>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground mt-1">
              Only administrators can record payments.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {fees!.map((fee) => (
            <FeeCard
              key={fee.id}
              fee={fee}
              studentId={studentId}
              isAdmin={isAdmin}
              canAssign={canAssign}
            />
          ))}
        </div>
      )}

      {canAssign && (
        <AssignFeeDialog studentId={studentId} open={assignOpen} onOpenChange={setAssignOpen} />
      )}
    </div>
  );
}
