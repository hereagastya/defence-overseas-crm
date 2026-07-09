import { useState } from 'react';
import { CalendarClock, CheckCircle2, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FollowupType } from '@doc/shared';
import { useStudentFollowUps, useCreateStudentFollowUp, useCompleteStudentFollowUp } from './api';
import type { StudentFollowupWithUsers } from './api';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  studentId: string;
}

const FOLLOWUP_TYPE_LABELS: Record<string, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  whatsapp: 'WhatsApp',
};

const createFollowUpSchema = z.object({
  type: z.nativeEnum(FollowupType),
  scheduled_at: z.string().min(1, 'Scheduled time is required'),
  notes: z.string().optional(),
});
type CreateFollowUpValues = z.infer<typeof createFollowUpSchema>;

function formatDateTime(dateStr: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function FollowUpCard({
  followUp,
  onComplete,
}: {
  followUp: StudentFollowupWithUsers;
  onComplete: (followUp: StudentFollowupWithUsers) => void;
}) {
  const isDone = followUp.status === 'completed';

  return (
    <div className={`rounded-md border p-4 space-y-2 ${isDone ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs capitalize">
              {FOLLOWUP_TYPE_LABELS[followUp.type] ?? followUp.type}
            </Badge>
            {isDone ? (
              <Badge
                variant="secondary"
                className="text-xs bg-green-500/10 text-green-600 border-0"
              >
                Completed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                Pending
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isDone ? 'Completed' : 'Scheduled'}: {formatDateTime(followUp.scheduled_at)}
          </p>
          {followUp.notes && <p className="text-xs text-muted-foreground">{followUp.notes}</p>}
          {followUp.outcome && (
            <p className="text-xs text-foreground">
              <span className="font-medium">Outcome:</span> {followUp.outcome}
            </p>
          )}
          {followUp.assigned_to_name && (
            <p className="text-xs text-muted-foreground">&middot; {followUp.assigned_to_name}</p>
          )}
        </div>

        {!isDone && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onComplete(followUp)}
            className="shrink-0 gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Complete
          </Button>
        )}
      </div>
    </div>
  );
}

export function StudentFollowUps({ studentId }: Props) {
  const { user } = useAuthStore();
  const { data: followUps, isLoading } = useStudentFollowUps(studentId);
  const { mutate: createFollowUp, isPending: isCreating } = useCreateStudentFollowUp(studentId);
  const { mutate: completeFollowUp, isPending: isCompleting } =
    useCompleteStudentFollowUp(studentId);

  const [createOpen, setCreateOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<StudentFollowupWithUsers | null>(null);
  const [outcomeValue, setOutcomeValue] = useState('');

  const form = useForm<CreateFollowUpValues>({
    resolver: zodResolver(createFollowUpSchema),
    defaultValues: {
      type: FollowupType.CALL,
      scheduled_at: '',
      notes: '',
    },
  });

  function onSubmit(values: CreateFollowUpValues) {
    if (!user) return;
    createFollowUp(
      {
        type: values.type,
        scheduled_at: new Date(values.scheduled_at).toISOString(),
        notes: values.notes || undefined,
        assigned_to: user.id,
        student_id: studentId,
      },
      {
        onSuccess: () => {
          toast({ title: 'Follow-up scheduled' });
          setCreateOpen(false);
          form.reset();
        },
      },
    );
  }

  function handleCompleteConfirm() {
    if (!completeTarget) return;
    completeFollowUp(
      { followUpId: completeTarget.id, outcome: outcomeValue },
      {
        onSuccess: () => {
          toast({ title: 'Follow-up completed' });
          setCompleteTarget(null);
          setOutcomeValue('');
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  const pending = followUps?.filter((f) => f.status !== 'completed') ?? [];
  const done = followUps?.filter((f) => f.status === 'completed') ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pending.length} pending &middot; {done.length} completed
        </p>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          Schedule Follow-up
        </Button>
      </div>

      {!followUps?.length ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CalendarClock className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((f) => (
            <FollowUpCard key={f.id} followUp={f} onComplete={(fu) => setCompleteTarget(fu)} />
          ))}
          {done.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground pt-2">Completed</p>
              {done.map((f) => (
                <FollowUpCard key={f.id} followUp={f} onComplete={(fu) => setCompleteTarget(fu)} />
              ))}
            </>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
          </DialogHeader>

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
                            {FOLLOWUP_TYPE_LABELS[t] ?? t}
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
                      <Input type="datetime-local" disabled={isCreating} {...field} />
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
                        placeholder="Any preparation notes…"
                        disabled={isCreating}
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
                  onClick={() => {
                    setCreateOpen(false);
                    form.reset();
                  }}
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

      <AlertDialog
        open={Boolean(completeTarget)}
        onOpenChange={(o) => {
          if (!o) {
            setCompleteTarget(null);
            setOutcomeValue('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Follow-up</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">Enter the outcome of this follow-up:</p>
            <Textarea
              placeholder="Outcome notes…"
              value={outcomeValue}
              onChange={(e) => setOutcomeValue(e.target.value)}
              disabled={isCompleting}
              rows={3}
              className="resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteConfirm} disabled={isCompleting}>
              {isCompleting ? 'Completing…' : 'Mark Complete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
