-- ============================================================
-- Migration 003: Triggers
-- ============================================================

-- ─── updated_at maintenance ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON public.university_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_student_fees_updated_at
  BEFORE UPDATE ON public.student_fees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_followups_updated_at
  BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_comms_updated_at
  BEFORE UPDATE ON public.communication_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Supabase auth user → public.users sync ──────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'counselor'
    ),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ─── Fee recalculation trigger ────────────────────────────────
-- Fires AFTER any INSERT/UPDATE/DELETE on payments.
-- Application code MUST NOT write amount_paid / remaining_amount directly.
CREATE OR REPLACE FUNCTION public.recalculate_student_fee()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_fee_id        UUID;
  v_total         NUMERIC(12,2);
  v_paid          NUMERIC(12,2);
  v_remaining     NUMERIC(12,2);
  v_new_status    payment_status;
  v_due_date      DATE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_fee_id := OLD.student_fee_id;
  ELSE
    v_fee_id := NEW.student_fee_id;
  END IF;

  SELECT
    sf.total_amount,
    COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'received' AND p.deleted_at IS NULL), 0),
    sf.due_date
  INTO v_total, v_paid, v_due_date
  FROM public.student_fees sf
  LEFT JOIN public.payments p ON p.student_fee_id = sf.id
  WHERE sf.id = v_fee_id
  GROUP BY sf.total_amount, sf.due_date;

  v_remaining := v_total - v_paid;

  IF v_paid = 0 THEN
    IF v_due_date IS NOT NULL AND v_due_date < CURRENT_DATE THEN
      v_new_status := 'overdue';
    ELSE
      v_new_status := 'pending';
    END IF;
  ELSIF v_paid >= v_total THEN
    v_new_status := 'paid';
  ELSE
    IF v_due_date IS NOT NULL AND v_due_date < CURRENT_DATE THEN
      v_new_status := 'overdue';
    ELSE
      v_new_status := 'partially_paid';
    END IF;
  END IF;

  UPDATE public.student_fees
  SET
    amount_paid      = v_paid,
    remaining_amount = v_remaining,
    status           = v_new_status
  WHERE id = v_fee_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recalculate_fee
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_student_fee();
