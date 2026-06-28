import { z } from 'zod';
import { LeadSource, LeadStage, LeadStatus, LeadScore } from '../enums';

const phoneRegex = /^\+?[1-9]\d{7,14}$/;

export const createLeadSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  phone: z.string().regex(phoneRegex, 'Enter a valid phone number with country code'),
  country: z.string().max(100).optional(),
  nationality: z.string().max(100).optional(),
  course: z.string().max(255).optional(),
  passport_number: z.string().max(50).optional(),
  lead_source: z.nativeEnum(LeadSource),
  lead_stage: z.nativeEnum(LeadStage).optional().default(LeadStage.NEW_INQUIRY),
  lead_status: z.nativeEnum(LeadStatus).optional().default(LeadStatus.NOT_ANSWERED),
  lead_score: z.nativeEnum(LeadScore).optional().default(LeadScore.COLD),
  assigned_counselor_id: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateLeadSchema = createLeadSchema.partial().omit({ lead_source: true });

export const updateLeadStageSchema = z.object({
  lead_stage: z.nativeEnum(LeadStage),
  notes: z.string().max(500).optional(),
});

export const assignLeadSchema = z.object({
  counselor_id: z.string().uuid('Invalid counselor ID'),
});

export const convertLeadSchema = z.object({
  date_of_birth: z.string().date().optional(),
  course: z.string().max(255).optional(),
  country: z.string().max(100).optional(),
});

export const leadFiltersSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  search: z.string().optional(),
  sort_by: z.string().optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  stage: z.nativeEnum(LeadStage).optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  score: z.nativeEnum(LeadScore).optional(),
  source: z.nativeEnum(LeadSource).optional(),
  counselor_id: z.string().uuid().optional(),
  country: z.string().optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type UpdateLeadStageInput = z.infer<typeof updateLeadStageSchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
export type LeadFiltersInput = z.infer<typeof leadFiltersSchema>;
