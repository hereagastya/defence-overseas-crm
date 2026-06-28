import { z } from 'zod';
import { StudentStage, LeadScore } from '../enums';

export const updateStudentSchema = z.object({
  full_name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10).max(20).optional(),
  date_of_birth: z.string().date().optional(),
  country: z.string().max(100).optional(),
  nationality: z.string().max(100).optional(),
  course: z.string().max(255).optional(),
  passport_number: z.string().max(50).optional(),
  lead_score: z.nativeEnum(LeadScore).optional(),
  assigned_counselor_id: z.string().uuid().optional().nullable(),
});

export const updateStudentStageSchema = z.object({
  student_stage: z.nativeEnum(StudentStage),
  notes: z.string().max(500).optional(),
});

export const studentFiltersSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  search: z.string().optional(),
  sort_by: z.string().optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  stage: z.nativeEnum(StudentStage).optional(),
  counselor_id: z.string().uuid().optional(),
  country: z.string().optional(),
  is_case_closed: z.coerce.boolean().optional(),
});

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type UpdateStudentStageInput = z.infer<typeof updateStudentStageSchema>;
export type StudentFiltersInput = z.infer<typeof studentFiltersSchema>;
