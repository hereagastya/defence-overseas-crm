import type { LeadSource, LeadStage, LeadStatus, LeadScore } from '../enums';

export interface Lead {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  country: string | null;
  nationality: string | null;
  course: string | null;
  passport_number: string | null;
  lead_source: LeadSource;
  lead_stage: LeadStage;
  lead_status: LeadStatus;
  lead_score: LeadScore;
  assigned_counselor_id: string | null;
  converted_at: string | null;
  converted_to_student_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Lead with joined counselor name for list views */
export interface LeadWithCounselor extends Lead {
  counselor_name: string | null;
  counselor_email: string | null;
}

export interface LeadFilters {
  stage?: LeadStage;
  status?: LeadStatus;
  score?: LeadScore;
  source?: LeadSource;
  counselor_id?: string;
  country?: string;
  date_from?: string;
  date_to?: string;
}
