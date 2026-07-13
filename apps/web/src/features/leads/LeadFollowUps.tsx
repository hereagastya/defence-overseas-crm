import { useState } from 'react';
import { Calendar, CheckCircle2, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FollowupType,
  FollowupStatus,
  FOLLOWUP_TYPE_LABELS,
  FOLLOWUP_STATUS_LABELS,
} from '@doc/shared';
import { useLeadFollowUps, useCreateLeadFollowUp, useCompleteFollowUp } from './api';
import type { FollowupWithUsers, CreateFollowUpForLeadInput } from './api';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { formatDateTime } from '@/lib/format';

interface Props {
  leadId: string;
}

const createFollowUpFormSchema = z.object({
  type: z.nativeEnum(FollowupType),
  scheduled_at: z.string().min(1, 'Date and time is required'),
  notes: z.string().max(2000).optional(),
});

const completeFollowUpSchema = z.object({
  outcome: z.string().min(1, 'Outcome is required').max(2000),
});

type CreateFollowUpFormValues = z.infer<typeof createFollowUpFormSchema>;
type CompleteFollowUpValues = z.infer<typeof completeFollowUpSchema>;

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === FollowupStatus.COMPLETED) return 'default';
  if (status === FollowupStatus.OVERDUE) return 'destructive';
  if (status === FollowupStatus.CANCELLED) return 'secondary';
  return 'outline';
}

function FollowUpRow({
  followUp,
  onComplete,
}: {
  followUp: FollowupWithUsers;
  onComplete: (f: FollowupWithUsers) => void;
}) {
  const isDone =
    followUp.status === FollowupStatus.COMPLETED || followUp.status === FollowupStatus.CANCELLED;
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {FOLLOWUP_TYPE_LABELS[followUp.type as FollowupType] ?? followUp.type}
        </p>
        <p className="text-xs text-muted-foreground">{formatDateTime(followUp.scheduled_at)}</p>
        {followUp.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{followUp.notes}</p>
        )}
        {followUp.outcome && (
          <p className="text-xs text-muted-foreground mt-0.5 italic">{followUp.outcome}</p>
        )}
        {followUp.assigned_to_name && (
          <p className="text-xs text-muted-foreground mt-0.5">&rarr; {followUp.assigned_to_name}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={statusVariant(followUp.status)} className="text-[10px]">
          {FOLLOWUP_STATUS_LABELS[followUp.status as FollowupStatus] ?? followUp.status}
        </Badge>
        {!isDone && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onComplete(followUp)}
            className="h-7 text-xs"
          >
            Complete
          </Button>
        )}
      </div>
    </div>
  );
}

export function LeadFollowUps({ leadId }: Props) {
  const user = useAuthStore((s) => s.user);
  const { data: followUps, isLoading, isError } = useLeadFollowUps(leadId);
  const { mutate: createFollowUp, isPending: isCreating } = useCreateLeadFollowUp(leadId);
  const { mutate: completeFollowUp, isPending: isCompleting } = useCompleteFollowUp(leadId);

  const [createOpen, setCreateOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<FollowupWithUsers | null>(null);

  const createForm = useForm<CreateFollowUpFormValues>({
    resolver: zodResolver(createFollowUpFormSchema),
    defaultValues: {
      type: FollowupType.CALL,
      scheduled_at: '',
      notes: '',
    },
  });

  const completeForm = useForm<CompleteFollowUpValues>({
    resolver: zodResolver(completeFollowUpSchema),
    defaultValues: { outcome: '' },
  });

  function onCreateSubmit(values: CreateFollowUpFormValues) {
    if (!user) return;
    const input: CreateFollowUpForLeadInput = {
      type: values.type,
      assigned_to: user.id,
      scheduled_at: new Date(values.scheduled_at).toISOString(),
      notes: values.notes || undefined,
      lead_id: leadId,
    };
    createFollowUp(input, {
      onSuccess: () => {
        toast({ title: 'Follow-up scheduled' });
        setCreateOpen(false);
        createForm.reset();
      },
    });
  }

  function onCompleteSubmit(values: CompleteFollowUpValues) {
    if (!completeTarget) return;
    completeFollowUp(
      { followUpId: completeTarget.id, outcome: values.outcome },
      {
        onSuccess: () => {
          toast({ title: 'Follow-up completed' });
          setCompleteTarget(null);
          completeForm.reset();
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive py-4">Failed to load follow-ups.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {followUps?.length ?? 0} {followUps?.length === 1 ? 'follow-up' : 'follow-ups'}
        </p>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          Schedule
        </Button>
      </div>

      {!followUps?.length ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle2 className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          {followUps.map((f) => (
            <FollowUpRow key={f.id} followUp={f} onComplete={setCompleteTarget} />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Follow-Up</DialogTitle>
            <DialogDescription>Create a follow-up linked to this lead.</DialogDescription>
          </DialogHeader>

          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isCreating}
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
                control={createForm.control}
                name="scheduled_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled At</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" disabled={isCreating} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Notes <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input disabled={isCreating} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Scheduling…' : 'Schedule'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Complete dialog */}
      <AlertDialog
        open={Boolean(completeTarget)}
        onOpenChange={(o) => {
          if (!o) {
            setCompleteTarget(null);
            completeForm.reset();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Follow-Up</AlertDialogTitle>
            <AlertDialogDescription>
              Record the outcome of this{' '}
              {completeTarget
                ? FOLLOWUP_TYPE_LABELS[completeTarget.type as FollowupType]
                : 'follow-up'}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Form {...completeForm}>
            <form
              id="complete-followup-form"
              onSubmit={completeForm.handleSubmit(onCompleteSubmit)}
            >
              <FormField
                control={completeForm.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outcome</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what happened…"
                        disabled={isCompleting}
                        rows={3}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              form="complete-followup-form"
              type="submit"
              disabled={isCompleting}
              onClick={(e) => {
                e.preventDefault();
                completeForm.handleSubmit(onCompleteSubmit)();
              }}
            >
              {isCompleting ? 'Completing…' : 'Complete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
