import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PaymentMethod, PAYMENT_METHOD_LABELS, InstallmentStatus } from '@doc/shared';
import type { RecordInstallmentInput } from '@doc/shared';
import { useRecordPayment } from './api';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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

interface Props {
  studentId: string;
  feeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  payment_method: z.nativeEnum(PaymentMethod),
  payment_date: z.string().min(1, 'Payment date is required'),
  reference_number: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

export function RecordPaymentDialog({ studentId, feeId, open, onOpenChange }: Props) {
  const { mutate: recordPayment, isPending } = useRecordPayment(studentId, feeId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: '' as unknown as number,
      payment_method: PaymentMethod.UPI,
      payment_date: todayIso(),
      reference_number: '',
      notes: '',
    },
  });

  function onSubmit(values: FormValues) {
    const input: RecordInstallmentInput = {
      amount: values.amount,
      payment_method: values.payment_method,
      payment_date: values.payment_date,
      status: InstallmentStatus.RECEIVED,
      reference_number: values.reference_number || undefined,
      notes: values.notes || undefined,
    };

    recordPayment(input, {
      onSuccess: () => {
        toast({ title: 'Payment recorded' });
        onOpenChange(false);
        form.reset({ payment_method: PaymentMethod.UPI, payment_date: todayIso() });
      },
    });
  }

  function handleClose(o: boolean) {
    if (!o) form.reset({ payment_method: PaymentMethod.UPI, payment_date: todayIso() });
    onOpenChange(o);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Record an installment for this fee.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        placeholder="e.g. 50000"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(PaymentMethod).map((m) => (
                        <SelectItem key={m} value={m}>
                          {PAYMENT_METHOD_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Reference / Transaction ID{' '}
                    <span className="text-muted-foreground text-xs">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. UPI Ref #" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Notes <span className="text-muted-foreground text-xs">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any notes about this payment…"
                      disabled={isPending}
                      rows={2}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Recording…' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
