import { z } from 'zod';
import { ApplicationStatus } from '../enums';

export const createApplicationSchema = z.object({
  university_name: z.string().min(2, 'University name is required').max(255),
  country: z.string().min(2, 'Country is required').max(100),
  course: z.string().min(2, 'Course is required').max(255),
  status: z.nativeEnum(ApplicationStatus).optional().default(ApplicationStatus.DRAFT),
  applied_at: z.string().date().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateApplicationSchema = z.object({
  university_name: z.string().min(2).max(255).optional(),
  country: z.string().min(2).max(100).optional(),
  course: z.string().min(2).max(255).optional(),
  status: z.nativeEnum(ApplicationStatus).optional(),
  applied_at: z.string().date().optional(),
  offer_received_at: z.string().date().optional(),
  offer_responded_at: z.string().date().optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
