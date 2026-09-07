-- ============================================================
-- Migration: Update lead and student SELECT policies
-- ============================================================
-- All active staff can see all leads and students.
-- Assignment is informational only — it never restricts visibility.
-- The UPDATE policies (mutation) remain ownership-based.

-- ─── leads ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "leads_select" ON public.leads;

CREATE POLICY "leads_select" ON public.leads
  FOR SELECT USING (public.is_active_staff());

-- ─── students ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "students_select" ON public.students;

CREATE POLICY "students_select" ON public.students
  FOR SELECT USING (public.is_active_staff());
