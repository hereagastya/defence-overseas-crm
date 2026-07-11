import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  TaskPriority,
  TaskStatus,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  API_ENDPOINTS,
} from '@doc/shared';
import type { EmployeeWithUser } from '@doc/shared';
import { apiClient } from '@/lib/api-client';
import { useUpdateTask } from './api';
import type { TaskWithUsers } from './api';
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
  task: TaskWithUsers;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(2000).optional(),
  assigned_to: z.string().uuid('Assignee is required'),
  priority: z.nativeEnum(TaskPriority),
  due_date: z.string().min(1, 'Due date is required'),
  status: z.nativeEnum(TaskStatus),
});

type FormValues = z.infer<typeof formSchema>;

function toDateInput(iso: string) {
  return iso.split('T')[0] ?? '';
}

export function EditTaskDialog({ task, open, onOpenChange }: Props) {
  const { mutate: updateTask, isPending } = useUpdateTask();

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
      title: task.title,
      description: task.description ?? '',
      assigned_to: task.assigned_to,
      priority: task.priority as TaskPriority,
      due_date: toDateInput(task.due_date),
      status: task.status as TaskStatus,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: task.title,
        description: task.description ?? '',
        assigned_to: task.assigned_to,
        priority: task.priority as TaskPriority,
        due_date: toDateInput(task.due_date),
        status: task.status as TaskStatus,
      });
    }
  }, [open, task, form]);

  function onSubmit(values: FormValues) {
    updateTask(
      {
        id: task.id,
        input: {
          title: values.title,
          description: values.description || undefined,
          assigned_to: values.assigned_to,
          priority: values.priority,
          due_date: new Date(values.due_date).toISOString(),
          status: values.status,
        },
      },
      {
        onSuccess: () => {
          toast({ title: 'Task updated' });
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>{task.title}</DialogDescription>
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
                    <Input disabled={isPending} {...field} />
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
                    <Textarea disabled={isPending} rows={2} className="resize-none" {...field} />
                  </FormControl>
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
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
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
                        {Object.values(TaskStatus).map((s) => (
                          <SelectItem key={s} value={s}>
                            {TASK_STATUS_LABELS[s]}
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
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isPending} {...field} />
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
