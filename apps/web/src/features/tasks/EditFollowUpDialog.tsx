import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { FollowupType, FollowupStatus, FOLLOWUP_TYPE_LABELS, API_ENDPOINTS } from '@doc/shared';
import type { EmployeeWithUser } from '@doc/shared';
import { apiClient } from '@/lib/api-client';
import { useUpdateFollowUp } from './api';
import type { FollowupWithUsers } from './api';
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
  followup: FollowupWithUsers;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  type: z.nativeEnum(FollowupType),
  assigned_to: z.string().uuid('Assignee is required'),
  scheduled_at: z.string().min(1, 'Scheduled date and time is required'),
  notes: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

function toDateTimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditFollowUpDialog({ followup, open, onOpenChange }: Props) {
  const { mutate: updateFollowUp, isPending } = useUpdateFollowUp();

  const isCompleted = followup.status === FollowupStatus.COMPLETED;

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () =>
      apiClient
        .get<{ data: EmployeeWithUser[] }>(API_ENDPOINTS.EMPLOYEES.LIST)
        .then((r) => r.data.data),
    enabled: open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: followup.type as FollowupType,
      assigned_to: followup.assigned_to,
      scheduled_at: toDateTimeLocal(followup.scheduled_at),
      notes: followup.notes ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        type: followup.type as FollowupType,
        assigned_to: followup.assigned_to,
        scheduled_at: toDateTimeLocal(followup.scheduled_at),
        notes: followup.notes ?? '',
      });
    }
  }, [open, followup, form]);

  function onSubmit(values: FormValues) {
    updateFollowUp(
      {
        id: followup.id,
        input: {
          type: values.type,
          assigned_to: values.assigned_to,
          scheduled_at: new Date(values.scheduled_at).toISOString(),
          notes: values.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: 'Follow-up updated' });
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Follow-up</DialogTitle>
          <DialogDescription>
            {FOLLOWUP_TYPE_LABELS[followup.type as FollowupType] ?? followup.type}
          </DialogDescription>
        </DialogHeader>

        {isCompleted && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            This follow-up is already completed and cannot be modified.
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending || isCompleted}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(FollowupType).map((t) => (
                        <SelectItem key={t} value={t}>
                          {FOLLOWUP_TYPE_LABELS[t]}
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
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending || isCompleted}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(employees ?? []).map((e) => (
                        <SelectItem key={e.user_id} value={e.user_id}>
                          {e.full_name}
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
              name="scheduled_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled At</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" disabled={isPending || isCompleted} {...field} />
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
                      disabled={isPending || isCompleted}
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
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              {!isCompleted && (
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
