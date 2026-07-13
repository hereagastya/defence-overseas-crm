import { useState } from 'react';
import { CheckCircle2, Circle, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TaskPriority, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TaskStatus } from '@doc/shared';
import { useLeadTasks, useCreateLeadTask, useCompleteTask } from './api';
import { formatDate } from '@/lib/format';
import type { TaskWithUsers, CreateTaskForLeadInput } from './api';
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

interface Props {
  leadId: string;
}

const createTaskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(2000).optional(),
  priority: z.nativeEnum(TaskPriority),
  due_date: z.string().min(1, 'Due date is required'),
});

type CreateTaskFormValues = z.infer<typeof createTaskFormSchema>;

function priorityVariant(priority: string): 'destructive' | 'default' | 'secondary' {
  if (priority === TaskPriority.HIGH) return 'destructive';
  if (priority === TaskPriority.MEDIUM) return 'default';
  return 'secondary';
}

function TaskRow({
  task,
  onComplete,
  isCompleting,
}: {
  task: TaskWithUsers;
  onComplete: (id: string) => void;
  isCompleting: boolean;
}) {
  const isDone = task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED;
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <button
        onClick={() => !isDone && onComplete(task.id)}
        disabled={isDone || isCompleting}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label={isDone ? 'Task done' : 'Mark complete'}
      >
        {isDone ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={priorityVariant(task.priority)} className="text-[10px] px-1.5 py-0">
            {TASK_PRIORITY_LABELS[task.priority as TaskPriority] ?? task.priority}
          </Badge>
          <span className="text-xs text-muted-foreground">Due {formatDate(task.due_date)}</span>
          {task.assigned_to_name && (
            <span className="text-xs text-muted-foreground">&middot; {task.assigned_to_name}</span>
          )}
        </div>
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0">
        {TASK_STATUS_LABELS[task.status as TaskStatus] ?? task.status}
      </Badge>
    </div>
  );
}

export function LeadTasks({ leadId }: Props) {
  const user = useAuthStore((s) => s.user);
  const { data: tasks, isLoading, isError } = useLeadTasks(leadId);
  const { mutate: createTask, isPending: isCreating } = useCreateLeadTask(leadId);
  const { mutate: completeTask, isPending: isCompleting } = useCompleteTask(leadId);

  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: TaskPriority.MEDIUM,
      due_date: '',
    },
  });

  function onSubmit(values: CreateTaskFormValues) {
    if (!user) return;
    const input: CreateTaskForLeadInput = {
      title: values.title,
      description: values.description || undefined,
      assigned_to: user.id,
      priority: values.priority,
      due_date: new Date(values.due_date).toISOString(),
      lead_id: leadId,
    };
    createTask(input, {
      onSuccess: () => {
        toast({ title: 'Task created' });
        setCreateOpen(false);
        form.reset();
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive py-4">Failed to load tasks.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tasks?.length ?? 0} {tasks?.length === 1 ? 'task' : 'tasks'}
        </p>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          Add Task
        </Button>
      </div>

      {!tasks?.length ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle2 className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        </div>
      ) : (
        <div className="rounded-md border divide-y divide-transparent">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onComplete={(id) =>
                completeTask(id, {
                  onSuccess: () => toast({ title: 'Task completed' }),
                })
              }
              isCompleting={isCompleting}
            />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>Create a task linked to this lead.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Follow up call" disabled={isCreating} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input disabled={isCreating} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
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
                          {Object.values(TaskPriority).map((p) => (
                            <SelectItem key={p} value={p}>
                              {TASK_PRIORITY_LABELS[p]}
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
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" disabled={isCreating} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                  {isCreating ? 'Creating…' : 'Create Task'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
