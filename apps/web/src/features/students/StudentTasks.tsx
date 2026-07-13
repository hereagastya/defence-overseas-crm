import { useState } from 'react';
import { CheckCircle2, Circle, ClipboardList, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TaskPriority, TASK_PRIORITY_LABELS } from '@doc/shared';
import { formatDate } from '@/lib/format';
import { useStudentTasks, useCreateStudentTask, useCompleteStudentTask } from './api';
import type { StudentTaskWithUsers } from './api';
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

interface Props {
  studentId: string;
}

const PRIORITY_VARIANTS: Record<string, 'secondary' | 'default' | 'destructive'> = {
  [TaskPriority.LOW]: 'secondary',
  [TaskPriority.MEDIUM]: 'default',
  [TaskPriority.HIGH]: 'destructive',
};

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority),
  due_date: z.string().min(1, 'Due date is required'),
});
type CreateTaskValues = z.infer<typeof createTaskSchema>;

function TaskCard({
  task,
  onComplete,
  completing,
}: {
  task: StudentTaskWithUsers;
  onComplete: (id: string) => void;
  completing: boolean;
}) {
  const isDone = task.status === 'completed';

  return (
    <div className={`rounded-md border p-4 space-y-2 ${isDone ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => !isDone && onComplete(task.id)}
          disabled={isDone || completing}
          aria-label={isDone ? 'Completed' : 'Mark as complete'}
          className="mt-0.5 shrink-0"
        >
          {isDone ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDone ? 'line-through' : ''}`}>{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant={PRIORITY_VARIANTS[task.priority] ?? 'secondary'} className="text-xs">
              {TASK_PRIORITY_LABELS[task.priority as TaskPriority] ?? task.priority}
            </Badge>
            {task.due_date && (
              <span className="text-xs text-muted-foreground">Due {formatDate(task.due_date)}</span>
            )}
            {task.assigned_to_name && (
              <span className="text-xs text-muted-foreground">
                &middot; {task.assigned_to_name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudentTasks({ studentId }: Props) {
  const { user } = useAuthStore();
  const { data: tasks, isLoading, isError } = useStudentTasks(studentId);
  const { mutate: createTask, isPending: isCreating } = useCreateStudentTask(studentId);
  const { mutate: completeTask, isPending: isCompleting } = useCompleteStudentTask(studentId);

  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: TaskPriority.MEDIUM,
      due_date: '',
    },
  });

  function handleComplete(taskId: string) {
    completeTask(taskId, {
      onSuccess: () => toast({ title: 'Task completed' }),
    });
  }

  function onSubmit(values: CreateTaskValues) {
    if (!user) return;
    createTask(
      {
        title: values.title,
        description: values.description || undefined,
        priority: values.priority,
        due_date: new Date(values.due_date).toISOString(),
        assigned_to: user.id,
        student_id: studentId,
      },
      {
        onSuccess: () => {
          toast({ title: 'Task created' });
          setDialogOpen(false);
          form.reset();
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive py-4">Failed to load tasks.</p>;
  }

  const pending = tasks?.filter((t) => t.status !== 'completed') ?? [];
  const done = tasks?.filter((t) => t.status === 'completed') ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pending.length} pending &middot; {done.length} completed
        </p>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          Add Task
        </Button>
      </div>

      {!tasks?.length ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <ClipboardList className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((t) => (
            <TaskCard key={t.id} task={t} onComplete={handleComplete} completing={isCompleting} />
          ))}
          {done.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground pt-2">Completed</p>
              {done.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onComplete={handleComplete}
                  completing={isCompleting}
                />
              ))}
            </>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
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
                      <Input placeholder="Task title…" disabled={isCreating} {...field} />
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
                      <Textarea
                        placeholder="Details…"
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
                  onClick={() => {
                    setDialogOpen(false);
                    form.reset();
                  }}
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
