import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
  InstallmentStatus,
  INSTALLMENT_STATUS_LABELS,
} from '@doc/shared';
import type { Payment, UpdateInstallmentInput } from '@doc/shared';
import { useUpdatePayment } from './api';
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
  payment: Payment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  payment_method: z.nativeEnum(PaymentMethod),
  payment_date: z.string().min(1, 'Payment date is required'),
  reference_number: z.string().max(100).optional(),
  status: z.nativeEnum(InstallmentStatus),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function EditPaymentDialog({ studentId, feeId, payment, open, onOpenChange }: Props) {
  const { mutate: updatePayment, isPending } = useUpdatePayment(studentId, feeId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: payment.amount,
      payment_method: payment.payment_method as PaymentMethod,
      payment_date: payment.payment_date,
      reference_number: payment.reference_number ?? '',
      status: payment.status as InstallmentStatus,
      notes: payment.notes ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amount: payment.amount,
        payment_method: payment.payment_method as PaymentMethod,
        payment_date: payment.payment_date,
        reference_number: payment.reference_number ?? '',
        status: payment.status as InstallmentStatus,
        notes: payment.notes ?? '',
      });
    }
  }, [open, payment, form]);

  function onSubmit(values: FormValues) {
    const input: UpdateInstallmentInput = {
      amount: values.amount,
      payment_method: values.payment_method,
      payment_date: values.payment_date,
      reference_number: values.reference_number || undefined,
      status: values.status,
      notes: values.notes || undefined,
    };

    updatePayment(
      { paymentId: payment.id, input },
      {
        onSuccess: () => {
          toast({ title: 'Payment updated' });
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogDescription>Receipt #{payment.receipt_number}</DialogDescription>
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
                      <Input type="number" min={1} step={1} disabled={isPending} {...field} />
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(InstallmentStatus).map((s) => (
                          <SelectItem key={s} value={s}>
                            {INSTALLMENT_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                    <Input disabled={isPending} {...field} />
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
                    <Textarea disabled={isPending} rows={2} className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
