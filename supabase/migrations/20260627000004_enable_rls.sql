-- ============================================================
-- Migration 004: Row Level Security
-- ============================================================

-- ─── RLS helper functions ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_my_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_active = true AND deleted_at IS NULL
  );
$$;

-- ─── Enable RLS on all tables ─────────────────────────────────
ALTER TABLE public.users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fees            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings                ENABLE ROW LEVEL SECURITY;

-- ─── users ────────────────────────────────────────────────────
CREATE POLICY "users_select_staff" ON public.users
  FOR SELECT USING (public.is_active_staff());

CREATE POLICY "users_insert_admin" ON public.users
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "users_update_self_login" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- ─── employees ────────────────────────────────────────────────
CREATE POLICY "employees_select_staff" ON public.employees
  FOR SELECT USING (public.is_active_staff());

CREATE POLICY "employees_insert_admin" ON public.employees
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "employees_update_admin" ON public.employees
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "employees_update_self" ON public.employees
  FOR UPDATE USING (user_id = auth.uid());

-- ─── leads ────────────────────────────────────────────────────
CREATE POLICY "leads_select" ON public.leads
  FOR SELECT USING (
    public.is_admin()
    OR assigned_counselor_id = auth.uid()
    OR assigned_counselor_id IS NULL
  );

CREATE POLICY "leads_insert_staff" ON public.leads
  FOR INSERT WITH CHECK (public.is_active_staff());

CREATE POLICY "leads_update" ON public.leads
  FOR UPDATE
  USING (public.is_admin() OR assigned_counselor_id = auth.uid())
  WITH CHECK (public.is_admin() OR assigned_counselor_id = auth.uid());

CREATE POLICY "leads_delete_admin" ON public.leads
  FOR DELETE USING (public.is_admin());

-- ─── students ─────────────────────────────────────────────────
CREATE POLICY "students_select" ON public.students
  FOR SELECT USING (
    public.is_admin()
    OR assigned_counselor_id = auth.uid()
    OR assigned_counselor_id IS NULL
  );

CREATE POLICY "students_insert_staff" ON public.students
  FOR INSERT WITH CHECK (public.is_active_staff());

CREATE POLICY "students_update" ON public.students
  FOR UPDATE
  USING (public.is_admin() OR assigned_counselor_id = auth.uid())
  WITH CHECK (public.is_admin() OR assigned_counselor_id = auth.uid());

-- ─── university_applications ──────────────────────────────────
CREATE POLICY "applications_select" ON public.university_applications
  FOR SELECT USING (
    public.is_active_staff()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND (public.is_admin() OR s.assigned_counselor_id = auth.uid())
    )
  );

CREATE POLICY "applications_insert" ON public.university_applications
  FOR INSERT WITH CHECK (
    public.is_active_staff()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND (public.is_admin() OR s.assigned_counselor_id = auth.uid())
    )
  );

CREATE POLICY "applications_update" ON public.university_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND (public.is_admin() OR s.assigned_counselor_id = auth.uid())
    )
  );

CREATE POLICY "applications_delete_admin" ON public.university_applications
  FOR DELETE USING (public.is_admin());

-- ─── documents ────────────────────────────────────────────────
CREATE POLICY "documents_select" ON public.documents
  FOR SELECT USING (
    public.is_active_staff()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND (public.is_admin() OR s.assigned_counselor_id = auth.uid())
    )
  );

CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT WITH CHECK (
    public.is_active_staff()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND (public.is_admin() OR s.assigned_counselor_id = auth.uid())
    )
  );

CREATE POLICY "documents_delete_admin" ON public.documents
  FOR DELETE USING (public.is_admin());

-- ─── student_fees ─────────────────────────────────────────────
CREATE POLICY "fees_select" ON public.student_fees
  FOR SELECT USING (
    public.is_active_staff()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND (public.is_admin() OR s.assigned_counselor_id = auth.uid())
    )
  );

CREATE POLICY "fees_insert_admin" ON public.student_fees
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "fees_update_admin" ON public.student_fees
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "fees_delete_admin" ON public.student_fees
  FOR DELETE USING (public.is_admin());

-- ─── payments ─────────────────────────────────────────────────
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (
    public.is_active_staff()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND (public.is_admin() OR s.assigned_counselor_id = auth.uid())
    )
  );

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (
    public.is_active_staff()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND (public.is_admin() OR s.assigned_counselor_id = auth.uid())
    )
  );

CREATE POLICY "payments_update_admin" ON public.payments
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "payments_delete_admin" ON public.payments
  FOR DELETE USING (public.is_admin());

-- ─── tasks ────────────────────────────────────────────────────
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (
    public.is_admin()
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "tasks_insert_staff" ON public.tasks
  FOR INSERT WITH CHECK (public.is_active_staff());

CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE
  USING (public.is_admin() OR assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "tasks_delete_admin" ON public.tasks
  FOR DELETE USING (public.is_admin());

-- ─── follow_ups ───────────────────────────────────────────────
CREATE POLICY "followups_select" ON public.follow_ups
  FOR SELECT USING (
    public.is_admin()
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "followups_insert_staff" ON public.follow_ups
  FOR INSERT WITH CHECK (public.is_active_staff());

CREATE POLICY "followups_update" ON public.follow_ups
  FOR UPDATE
  USING (public.is_admin() OR assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "followups_delete_admin" ON public.follow_ups
  FOR DELETE USING (public.is_admin());

-- ─── communication_logs ───────────────────────────────────────
CREATE POLICY "comms_select" ON public.communication_logs
  FOR SELECT USING (
    public.is_admin()
    OR logged_by = auth.uid()
  );

CREATE POLICY "comms_insert_staff" ON public.communication_logs
  FOR INSERT WITH CHECK (public.is_active_staff());

CREATE POLICY "comms_update" ON public.communication_logs
  FOR UPDATE USING (public.is_admin() OR logged_by = auth.uid());

CREATE POLICY "comms_delete_admin" ON public.communication_logs
  FOR DELETE USING (public.is_admin());

-- ─── notes ────────────────────────────────────────────────────
CREATE POLICY "notes_select" ON public.notes
  FOR SELECT USING (public.is_active_staff());

CREATE POLICY "notes_insert_staff" ON public.notes
  FOR INSERT WITH CHECK (public.is_active_staff());

CREATE POLICY "notes_update" ON public.notes
  FOR UPDATE USING (public.is_admin() OR created_by = auth.uid());

CREATE POLICY "notes_delete" ON public.notes
  FOR DELETE USING (public.is_admin() OR created_by = auth.uid());

-- ─── notifications ────────────────────────────────────────────
CREATE POLICY "notifications_select_self" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update_self" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_delete_self" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

-- ─── activity_logs ────────────────────────────────────────────
CREATE POLICY "activity_select_staff" ON public.activity_logs
  FOR SELECT USING (public.is_active_staff());

-- Only service role (API server) may insert — client inserts are blocked.
CREATE POLICY "activity_insert_service" ON public.activity_logs
  FOR INSERT WITH CHECK (false);

-- ─── settings ─────────────────────────────────────────────────
CREATE POLICY "settings_select_staff" ON public.settings
  FOR SELECT USING (public.is_active_staff());

CREATE POLICY "settings_update_admin" ON public.settings
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
