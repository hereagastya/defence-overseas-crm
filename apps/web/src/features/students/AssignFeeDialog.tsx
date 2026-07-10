import { useState } from 'react';
import {
  PaymentCategory,
  PAYMENT_CATEGORY_LABELS,
  STANDARD_FEE_AMOUNTS,
  UserRole,
} from '@doc/shared';
import type { AssignFeeInput } from '@doc/shared';
import { useAuthStore } from '@/store/useAuthStore';
import { useAssignFee } from './api';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface Props {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AssignFeeDialog({ studentId, open, onOpenChange }: Props) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;
  const { mutate: assignFee, isPending } = useAssignFee(studentId);

  const [category, setCategory] = useState<PaymentCategory>(PaymentCategory.REGISTRATION_FEE);
  const [totalAmountStr, setTotalAmountStr] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function reset() {
    setCategory(PaymentCategory.REGISTRATION_FEE);
    setTotalAmountStr('');
    setDueDate('');
    setNotes('');
    setErrors({});
  }

  function validate(): AssignFeeInput | null {
    const errs: Record<string, string> = {};
    let totalAmount: number | undefined;

    if (isAdmin && totalAmountStr) {
      const parsed = Number(totalAmountStr);
      if (isNaN(parsed) || parsed <= 0) {
        errs.totalAmount = 'Amount must be a positive number.';
      } else {
        totalAmount = parsed;
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return null;
    }

    return {
      category,
      total_amount: totalAmount,
      due_date: dueDate || undefined,
      notes: notes || undefined,
    };
  }

  function handleSubmit() {
    const input = validate();
    if (!input) return;

    assignFee(input, {
      onSuccess: () => {
        toast({ title: 'Fee assigned successfully' });
        onOpenChange(false);
        reset();
      },
    });
  }

  function handleClose(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  const standardAmount = STANDARD_FEE_AMOUNTS[category];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Fee</DialogTitle>
          <DialogDescription>Assign a fee category to this student.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fee-category">Fee Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as PaymentCategory)}
              disabled={isPending}
            >
              <SelectTrigger id="fee-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PaymentCategory).map((c) => (
                  <SelectItem key={c} value={c}>
                    {PAYMENT_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Standard amount: {formatCurrency(standardAmount)}
            </p>
          </div>

          {isAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="fee-amount">
                Custom Amount{' '}
                <span className="text-muted-foreground text-xs">(optional override)</span>
              </Label>
              <Input
                id="fee-amount"
                type="number"
                min={1}
                placeholder={String(standardAmount)}
                disabled={isPending}
                value={totalAmountStr}
                onChange={(e) => {
                  setTotalAmountStr(e.target.value);
                  setErrors((p) => ({ ...p, totalAmount: '' }));
                }}
              />
              {errors.totalAmount && (
                <p className="text-xs text-destructive">{errors.totalAmount}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fee-due-date">
              Due Date <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="fee-due-date"
              type="date"
              disabled={isPending}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fee-notes">
              Notes <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="fee-notes"
              placeholder="Any notes about this fee…"
              disabled={isPending}
              rows={3}
              className="resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
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
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Assigning…' : 'Assign Fee'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
