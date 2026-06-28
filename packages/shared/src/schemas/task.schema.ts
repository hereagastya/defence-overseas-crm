import { z } from 'zod';
import { TaskPriority, TaskStatus } from '../enums';

export const createTaskSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(500),
    description: z.string().max(2000).optional(),
    assigned_to: z.string().uuid('Assignee is required'),
    priority: z.nativeEnum(TaskPriority),
    due_date: z.string().datetime('Enter a valid due date'),
    lead_id: z.string().uuid().optional(),
    student_id: z.string().uuid().optional(),
  })
  .refine((data) => Boolean(data.lead_id) !== Boolean(data.student_id), {
    message: 'A task must be linked to exactly one lead or one student',
    path: ['lead_id'],
  });

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  assigned_to: z.string().uuid().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  due_date: z.string().datetime().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
});

export const taskFiltersSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigned_to: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
  due_from: z.string().date().optional(),
  due_to: z.string().date().optional(),
  overdue_only: z.coerce.boolean().optional().default(false),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskFiltersInput = z.infer<typeof taskFiltersSchema>;
