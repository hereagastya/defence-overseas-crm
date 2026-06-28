-- ============================================================
-- Migration 002: All 15 Tables
-- ============================================================

-- ─── 1. users ────────────────────────────────────────────────
-- Extends Supabase auth.users with CRM-specific fields.
-- id matches auth.users.id (Supabase manages the auth side).
CREATE TABLE public.users (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT        NOT NULL UNIQUE,
  role              user_role   NOT NULL DEFAULT 'counselor',
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_users_role     ON public.users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active   ON public.users(is_active) WHERE deleted_at IS NULL;

-- ─── 2. employees ────────────────────────────────────────────
-- Employee profile linked 1:1 to a user. Holds display info.
CREATE TABLE public.employees (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE RESTRICT,
  full_name     TEXT        NOT NULL,
  phone         TEXT        NOT NULL UNIQUE,
  designation   TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_employees_user ON public.employees(user_id);

-- ─── 3. leads ────────────────────────────────────────────────
-- Prospective students from Meta Ads, website, or manual entry.
CREATE TABLE public.leads (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name                 TEXT          NOT NULL,
  email                     TEXT,
  phone                     TEXT          NOT NULL,
  country                   TEXT,
  nationality               TEXT,
  course                    TEXT,
  passport_number           TEXT,
  lead_source               lead_source   NOT NULL DEFAULT 'manual',
  lead_stage                lead_stage    NOT NULL DEFAULT 'new_inquiry',
  lead_status               lead_status   NOT NULL DEFAULT 'not_answered',
  lead_score                lead_score    NOT NULL DEFAULT 'cold',
  assigned_counselor_id     UUID          REFERENCES public.users(id) ON DELETE SET NULL,
  meta_lead_id              TEXT          UNIQUE,
  converted_at              TIMESTAMPTZ,
  converted_to_student_id   UUID,
  notes                     TEXT,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at                TIMESTAMPTZ,
  CONSTRAINT chk_leads_converted CHECK (
    (converted_to_student_id IS NULL) OR (converted_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uq_leads_phone_active ON public.leads(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_stage      ON public.leads(lead_stage) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_status     ON public.leads(lead_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_counselor  ON public.leads(assigned_counselor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_phone      ON public.leads(phone);
CREATE INDEX idx_leads_created    ON public.leads(created_at DESC);

-- ─── 4. students ─────────────────────────────────────────────
-- Created ONLY via lead conversion (PRD §3 scope decision).
CREATE TABLE public.students (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               UUID            NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE RESTRICT,
  full_name             TEXT            NOT NULL,
  email                 TEXT,
  phone                 TEXT            NOT NULL,
  date_of_birth         DATE,
  country               TEXT,
  nationality           TEXT,
  course                TEXT,
  passport_number       TEXT,
  student_stage         student_stage   NOT NULL DEFAULT 'registered_student',
  lead_score            lead_score      NOT NULL DEFAULT 'cold',
  assigned_counselor_id UUID            REFERENCES public.users(id) ON DELETE SET NULL,
  case_closed_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

-- Resolve the circular FK: leads → students
ALTER TABLE public.leads
  ADD CONSTRAINT fk_leads_converted_student
  FOREIGN KEY (converted_to_student_id) REFERENCES public.students(id) ON DELETE SET NULL;

CREATE INDEX idx_students_stage     ON public.students(student_stage) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_counselor ON public.students(assigned_counselor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_phone     ON public.students(phone);
CREATE INDEX idx_students_created   ON public.students(created_at DESC);

-- ─── 5. university_applications ──────────────────────────────
CREATE TABLE public.university_applications (
  id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID                NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  university_name     TEXT                NOT NULL,
  country             TEXT                NOT NULL,
  course              TEXT                NOT NULL,
  status              application_status  NOT NULL DEFAULT 'draft',
  applied_at          DATE,
  offer_received_at   DATE,
  offer_responded_at  DATE,
  notes               TEXT,
  created_by          UUID                NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ         NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_active_application
  ON public.university_applications(student_id, university_name)
  WHERE deleted_at IS NULL AND status NOT IN ('offer_rejected', 'withdrawn');

CREATE INDEX idx_applications_student ON public.university_applications(student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_status  ON public.university_applications(status) WHERE deleted_at IS NULL;

-- ─── 6. documents ────────────────────────────────────────────
-- Metadata only; files live in Supabase Storage (private bucket).
CREATE TABLE public.documents (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID            NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  application_id  UUID            REFERENCES public.university_applications(id) ON DELETE SET NULL,
  document_type   document_type   NOT NULL,
  file_url        TEXT            NOT NULL,
  file_name       TEXT            NOT NULL,
  file_size       INTEGER         NOT NULL CHECK (file_size > 0),
  mime_type       TEXT            NOT NULL,
  version         INTEGER         NOT NULL DEFAULT 1 CHECK (version > 0),
  is_latest       BOOLEAN         NOT NULL DEFAULT true,
  uploaded_by     UUID            NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_documents_student ON public.documents(student_id, document_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_latest  ON public.documents(student_id, document_type) WHERE is_latest = true AND deleted_at IS NULL;

-- ─── 7. student_fees ──────────────────────────────────────────
-- One row per fee category per student. Totals are trigger-maintained.
CREATE TABLE public.student_fees (
  id                   UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id           UUID                NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  category             payment_category    NOT NULL,
  total_amount         NUMERIC(12,2)       NOT NULL,
  amount_paid          NUMERIC(12,2)       NOT NULL DEFAULT 0,
  remaining_amount     NUMERIC(12,2)       NOT NULL,
  currency             CHAR(3)             NOT NULL DEFAULT 'INR',
  status               payment_status      NOT NULL DEFAULT 'pending',
  due_date             DATE,
  is_amount_overridden BOOLEAN             NOT NULL DEFAULT false,
  notes                TEXT,
  assigned_by          UUID                NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at           TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ         NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ,
  CONSTRAINT chk_total_positive    CHECK (total_amount > 0),
  CONSTRAINT chk_paid_not_negative CHECK (amount_paid >= 0),
  CONSTRAINT chk_remaining         CHECK (remaining_amount >= 0)
);

CREATE UNIQUE INDEX uq_student_fee_category
  ON public.student_fees(student_id, category) WHERE deleted_at IS NULL;

CREATE INDEX idx_student_fees_student ON public.student_fees(student_id);
CREATE INDEX idx_student_fees_status  ON public.student_fees(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_student_fees_due     ON public.student_fees(due_date) WHERE status != 'paid' AND deleted_at IS NULL;

-- ─── 8. payments (installments) ───────────────────────────────
-- Each row is ONE installment against a student_fee.
CREATE TABLE public.payments (
  id                UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_id    UUID                NOT NULL REFERENCES public.student_fees(id) ON DELETE RESTRICT,
  student_id        UUID                NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  amount            NUMERIC(12,2)       NOT NULL,
  currency          CHAR(3)             NOT NULL DEFAULT 'INR',
  payment_method    payment_method      NOT NULL,
  status            installment_status  NOT NULL DEFAULT 'received',
  payment_date      DATE                NOT NULL,
  reference_number  TEXT,
  receipt_number    TEXT                NOT NULL UNIQUE,
  receipt_url       TEXT,
  notes             TEXT,
  recorded_by       UUID                NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ         NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT chk_payments_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_payments_currency        CHECK (char_length(currency) = 3)
);

CREATE INDEX idx_payments_student_fee ON public.payments(student_fee_id);
CREATE INDEX idx_payments_student     ON public.payments(student_id);
CREATE INDEX idx_payments_status      ON public.payments(status);
CREATE INDEX idx_payments_date        ON public.payments(payment_date DESC);

-- ─── 9. tasks ─────────────────────────────────────────────────
CREATE TABLE public.tasks (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT            NOT NULL,
  description   TEXT,
  lead_id       UUID            REFERENCES public.leads(id) ON DELETE RESTRICT,
  student_id    UUID            REFERENCES public.students(id) ON DELETE RESTRICT,
  assigned_to   UUID            NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_by    UUID            NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  priority      task_priority   NOT NULL DEFAULT 'medium',
  status        task_status     NOT NULL DEFAULT 'open',
  due_date      TIMESTAMPTZ     NOT NULL,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ,
  CONSTRAINT chk_task_single_link CHECK (
    (lead_id IS NOT NULL AND student_id IS NULL) OR
    (lead_id IS NULL AND student_id IS NOT NULL)
  )
);

CREATE INDEX idx_tasks_assignee ON public.tasks(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_lead     ON public.tasks(lead_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_student  ON public.tasks(student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status   ON public.tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due      ON public.tasks(due_date) WHERE status NOT IN ('completed', 'cancelled') AND deleted_at IS NULL;

-- ─── 10. follow_ups ───────────────────────────────────────────
CREATE TABLE public.follow_ups (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  type          followup_type   NOT NULL,
  lead_id       UUID            REFERENCES public.leads(id) ON DELETE RESTRICT,
  student_id    UUID            REFERENCES public.students(id) ON DELETE RESTRICT,
  assigned_to   UUID            NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_by    UUID            NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  scheduled_at  TIMESTAMPTZ     NOT NULL,
  status        followup_status NOT NULL DEFAULT 'scheduled',
  outcome       TEXT,
  completed_at  TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ,
  CONSTRAINT chk_followup_single_link CHECK (
    (lead_id IS NOT NULL AND student_id IS NULL) OR
    (lead_id IS NULL AND student_id IS NOT NULL)
  ),
  CONSTRAINT chk_followup_outcome CHECK (
    status != 'completed' OR outcome IS NOT NULL
  )
);

CREATE INDEX idx_followups_assignee  ON public.follow_ups(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_followups_lead      ON public.follow_ups(lead_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_followups_student   ON public.follow_ups(student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_followups_scheduled ON public.follow_ups(scheduled_at) WHERE status IN ('scheduled', 'overdue') AND deleted_at IS NULL;

-- ─── 11. communication_logs ───────────────────────────────────
CREATE TABLE public.communication_logs (
  id                UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  type              communication_type  NOT NULL,
  lead_id           UUID                REFERENCES public.leads(id) ON DELETE RESTRICT,
  student_id        UUID                REFERENCES public.students(id) ON DELETE RESTRICT,
  logged_by         UUID                NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  summary           TEXT                NOT NULL,
  duration_minutes  INTEGER             CHECK (duration_minutes > 0),
  logged_at         TIMESTAMPTZ         NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ         NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT chk_comms_single_link CHECK (
    (lead_id IS NOT NULL AND student_id IS NULL) OR
    (lead_id IS NULL AND student_id IS NOT NULL)
  )
);

CREATE INDEX idx_comms_lead    ON public.communication_logs(lead_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comms_student ON public.communication_logs(student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comms_logged  ON public.communication_logs(logged_at DESC);

-- ─── 12. notes ────────────────────────────────────────────────
CREATE TABLE public.notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  content     TEXT        NOT NULL,
  lead_id     UUID        REFERENCES public.leads(id) ON DELETE RESTRICT,
  student_id  UUID        REFERENCES public.students(id) ON DELETE RESTRICT,
  created_by  UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT chk_notes_single_link CHECK (
    (lead_id IS NOT NULL AND student_id IS NULL) OR
    (lead_id IS NULL AND student_id IS NOT NULL)
  )
);

CREATE INDEX idx_notes_lead    ON public.notes(lead_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_student ON public.notes(student_id) WHERE deleted_at IS NULL;

-- ─── 13. notifications ────────────────────────────────────────
CREATE TABLE public.notifications (
  id            UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID                    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT                    NOT NULL,
  body          TEXT                    NOT NULL,
  priority      notification_priority   NOT NULL DEFAULT 'medium',
  status        notification_status     NOT NULL DEFAULT 'unread',
  entity_type   TEXT,
  entity_id     UUID,
  created_at    TIMESTAMPTZ             NOT NULL DEFAULT now(),
  read_at       TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user   ON public.notifications(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_entity ON public.notifications(entity_type, entity_id) WHERE entity_id IS NOT NULL;

-- ─── 14. activity_logs ────────────────────────────────────────
-- Immutable audit trail — NO updated_at, NO deleted_at.
CREATE TABLE public.activity_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  entity_type     TEXT        NOT NULL,
  entity_id       UUID        NOT NULL,
  action          TEXT        NOT NULL,
  previous_value  JSONB,
  new_value       JSONB,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_entity  ON public.activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_actor   ON public.activity_logs(actor_id);
CREATE INDEX idx_activity_created ON public.activity_logs(created_at DESC);

-- ─── 15. settings ─────────────────────────────────────────────
CREATE TABLE public.settings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        NOT NULL UNIQUE,
  value       JSONB       NOT NULL,
  description TEXT,
  updated_by  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
