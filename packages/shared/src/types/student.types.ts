import type { StudentStage, LeadScore, ApplicationStatus, DocumentType } from '../enums';

export interface Student {
  id: string;
  lead_id: string;
  full_name: string;
  email: string | null;
  phone: string;
  date_of_birth: string | null;
  country: string | null;
  nationality: string | null;
  course: string | null;
  passport_number: string | null;
  student_stage: StudentStage;
  lead_score: LeadScore;
  assigned_counselor_id: string | null;
  case_closed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StudentWithCounselor extends Student {
  counselor_name: string | null;
  counselor_email: string | null;
}

export interface StudentFilters {
  stage?: StudentStage;
  counselor_id?: string;
  country?: string;
  is_case_closed?: boolean;
}

export interface UniversityApplication {
  id: string;
  student_id: string;
  university_name: string;
  country: string;
  course: string;
  status: ApplicationStatus;
  applied_at: string | null;
  offer_received_at: string | null;
  offer_responded_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Document {
  id: string;
  student_id: string;
  application_id: string | null;
  document_type: DocumentType;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  version: number;
  is_latest: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
