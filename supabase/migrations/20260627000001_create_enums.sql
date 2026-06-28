-- ============================================================
-- Migration 001: PostgreSQL Enums
-- Must be run BEFORE 20260627000002_create_tables.sql
-- ============================================================

-- user_role
CREATE TYPE user_role AS ENUM (
  'admin',
  'counselor',
  'pre_counselor'
);

-- lead_stage — 9 pipeline stages (PRD §5)
CREATE TYPE lead_stage AS ENUM (
  'new_inquiry',
  'pre_counseling',
  'one_to_one_counseling',
  'mock_test',
  'webinar',
  'registration',
  'post_counseling',
  'registration_completed',
  'converted_to_student'
);

-- lead_status (UI spec §2.4)
CREATE TYPE lead_status AS ENUM (
  'interested',
  'not_interested',
  'dead',
  'not_answered',
  'call_back',
  'next_year'
);

-- lead_score (UI spec §2.4)
CREATE TYPE lead_score AS ENUM (
  'hot',
  'warm',
  'cold'
);

-- lead_source (PRD §5)
CREATE TYPE lead_source AS ENUM (
  'meta_ads',
  'website',
  'manual',
  'referral'
);

-- student_stage — 22 journey stages (PRD §6)
CREATE TYPE student_stage AS ENUM (
  'registered_student',
  'documents_pending',
  'documents_complete',
  'application_submitted',
  'under_review',
  'offer_received',
  'offer_accepted',
  'financial_review',
  'profile_evaluation',
  'university_selection',
  'counselling_completed',
  'contacted_scheduled',
  'visa_documentation',
  'visa_submitted',
  'biometrics_completed',
  'visa_approved',
  'pre_departure',
  'travel_confirmed',
  'departed',
  'arrived_successfully',
  'active_student',
  'case_closed'
);

-- application_status (PRD §7)
CREATE TYPE application_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'offer_received',
  'offer_accepted',
  'offer_rejected',
  'withdrawn'
);

-- document_type (PRD §8)
CREATE TYPE document_type AS ENUM (
  'passport',
  'transcripts',
  'offer_letter',
  'admission_letter',
  'visa',
  'financial',
  'neet_scorecard',
  'tenth_marksheet',
  'twelfth_marksheet',
  'other'
);

-- task_priority (PRD §9)
CREATE TYPE task_priority AS ENUM (
  'high',
  'medium',
  'low'
);

-- task_status (PRD §9)
CREATE TYPE task_status AS ENUM (
  'open',
  'in_progress',
  'completed',
  'cancelled'
);

-- followup_type (PRD §10)
CREATE TYPE followup_type AS ENUM (
  'call',
  'meeting',
  'email',
  'whatsapp'
);

-- followup_status (PRD §10)
CREATE TYPE followup_status AS ENUM (
  'scheduled',
  'completed',
  'overdue',
  'cancelled'
);

-- communication_type (PRD §12)
CREATE TYPE communication_type AS ENUM (
  'call',
  'meeting',
  'email',
  'whatsapp'
);

-- notification_priority (PRD §21)
CREATE TYPE notification_priority AS ENUM (
  'critical',
  'high',
  'medium',
  'low'
);

-- notification_status (PRD §21)
CREATE TYPE notification_status AS ENUM (
  'unread',
  'read',
  'archived'
);

-- payment_method (PRD §20.4 — unchanged from original)
CREATE TYPE payment_method AS ENUM (
  'upi',
  'bank_transfer',
  'cash',
  'card',
  'cheque',
  'other'
);

-- payment_category — 5 fixed fee categories (DB Update)
CREATE TYPE payment_category AS ENUM (
  'registration_fee',
  'imat_classes',
  'imat_seat_booking',
  'admission_process',
  'visa_process'
);

-- payment_status — overall fee status (DB Update — expanded)
CREATE TYPE payment_status AS ENUM (
  'pending',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled'
);

-- installment_status — per-installment row status (DB Update — NEW)
CREATE TYPE installment_status AS ENUM (
  'pending',
  'received',
  'refunded',
  'cancelled'
);
