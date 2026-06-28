import { z } from 'zod';

export const createNoteSchema = z
  .object({
    content: z.string().min(1, 'Note content is required').max(5000),
    lead_id: z.string().uuid().optional(),
    student_id: z.string().uuid().optional(),
  })
  .refine((data) => Boolean(data.lead_id) !== Boolean(data.student_id), {
    message: 'A note must be linked to exactly one lead or one student',
    path: ['lead_id'],
  });

export const updateNoteSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const createCommunicationSchema = z
  .object({
    type: z.enum(['call', 'meeting', 'email', 'whatsapp']),
    summary: z.string().min(1, 'Summary is required').max(2000),
    duration_minutes: z.number().int().positive().optional(),
    logged_at: z.string().datetime().optional(),
    lead_id: z.string().uuid().optional(),
    student_id: z.string().uuid().optional(),
  })
  .refine((data) => Boolean(data.lead_id) !== Boolean(data.student_id), {
    message: 'A communication log must be linked to exactly one lead or one student',
    path: ['lead_id'],
  });

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type CreateCommunicationInput = z.infer<typeof createCommunicationSchema>;
