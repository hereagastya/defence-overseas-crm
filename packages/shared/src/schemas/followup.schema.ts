import { z } from 'zod';
import { FollowupType, FollowupStatus } from '../enums';

export const createFollowupSchema = z
  .object({
    type: z.nativeEnum(FollowupType),
    assigned_to: z.string().uuid('Assignee is required'),
    scheduled_at: z.string().datetime('Enter a valid date and time'),
    lead_id: z.string().uuid().optional(),
    student_id: z.string().uuid().optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((data) => Boolean(data.lead_id) !== Boolean(data.student_id), {
    message: 'A follow-up must be linked to exactly one lead or one student',
    path: ['lead_id'],
  });

export const updateFollowupSchema = z.object({
  type: z.nativeEnum(FollowupType).optional(),
  assigned_to: z.string().uuid().optional(),
  scheduled_at: z.string().datetime().optional(),
  status: z.nativeEnum(FollowupStatus).optional(),
  outcome: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});

export const completeFollowupSchema = z.object({
  outcome: z.string().min(1, 'Outcome is required when completing a follow-up').max(2000),
});

export const followupFiltersSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.nativeEnum(FollowupStatus).optional(),
  type: z.nativeEnum(FollowupType).optional(),
  assigned_to: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  overdue_only: z.coerce.boolean().optional().default(false),
});

export type CreateFollowupInput = z.infer<typeof createFollowupSchema>;
export type UpdateFollowupInput = z.infer<typeof updateFollowupSchema>;
export type CompleteFollowupInput = z.infer<typeof completeFollowupSchema>;
export type FollowupFiltersInput = z.infer<typeof followupFiltersSchema>;
