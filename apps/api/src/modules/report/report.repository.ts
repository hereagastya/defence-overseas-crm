import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ReportDateFilters {
  from?: string;
  to?: string;
  counselor_id?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface LeadsReport {
  total: number;
  by_stage: ChartDataPoint[];
  by_source: ChartDataPoint[];
  by_status: ChartDataPoint[];
  by_score: ChartDataPoint[];
  conversions: number;
  conversion_rate: number;
}

export interface RevenueReport {
  total_revenue: number;
  total_agreed: number;
  total_outstanding: number;
  by_category: Array<{ category: string; total_agreed: number; total_collected: number }>;
  monthly: Array<{ month: string; amount: number }>;
}

export interface CounselorPerformanceEntry {
  counselor_id: string;
  counselor_name: string;
  leads_assigned: number;
  students_managed: number;
  conversions: number;
  tasks_completed: number;
  followups_completed: number;
  revenue_collected: number;
}

export interface CounselorPerformanceReport {
  counselors: CounselorPerformanceEntry[];
}

export interface StudentProgressReport {
  total: number;
  by_stage: ChartDataPoint[];
  cases_closed: number;
}

export interface ApplicationsReport {
  total: number;
  by_status: ChartDataPoint[];
  by_university: Array<{ university: string; count: number }>;
}

export interface CountryDistributionReport {
  leads_by_country: ChartDataPoint[];
  students_by_country: ChartDataPoint[];
  leads_by_nationality: ChartDataPoint[];
}

export interface TasksReport {
  total: number;
  by_status: ChartDataPoint[];
  by_priority: ChartDataPoint[];
  completion_rate: number;
  overdue: number;
}

export interface FollowUpsReport {
  total: number;
  by_status: ChartDataPoint[];
  by_type: ChartDataPoint[];
  completion_rate: number;
  overdue: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function countByKey<T extends Record<string, unknown>>(items: T[], key: keyof T): ChartDataPoint[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const v = String(item[key] ?? 'unknown');
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

// ── Repository functions ───────────────────────────────────────────────────────

export async function getLeadsReport(
  filters: ReportDateFilters,
  userId: string,
  isAdmin: boolean,
): Promise<LeadsReport> {
  let query = supabaseAdmin
    .from('leads')
    .select('lead_stage, lead_source, lead_status, lead_score, converted_at')
    .is('deleted_at', null);

  if (!isAdmin) {
    query = query.or(`assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`);
  } else if (filters.counselor_id) {
    query = query.eq('assigned_counselor_id', filters.counselor_id);
  }

  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to generate leads report');

  type LeadRow = {
    lead_stage: string;
    lead_source: string;
    lead_status: string;
    lead_score: string;
    converted_at: string | null;
  };

  const leads = (data ?? []) as unknown as LeadRow[];
  const total = leads.length;
  const conversions = leads.filter((l) => l.converted_at !== null).length;
  const conversionRate = total > 0 ? Math.round((conversions / total) * 100 * 10) / 10 : 0;

  return {
    total,
    by_stage: countByKey(leads, 'lead_stage'),
    by_source: countByKey(leads, 'lead_source'),
    by_status: countByKey(leads, 'lead_status'),
    by_score: countByKey(leads, 'lead_score'),
    conversions,
    conversion_rate: conversionRate,
  };
}

export async function getRevenueReport(
  filters: ReportDateFilters,
  _userId: string,
  _isAdmin: boolean,
): Promise<RevenueReport> {
  const feesQuery = supabaseAdmin
    .from('student_fees')
    .select('category, total_amount, amount_paid, remaining_amount, status')
    .is('deleted_at', null);

  let paymentsQuery = supabaseAdmin
    .from('payments')
    .select('amount, payment_date')
    .is('deleted_at', null)
    .eq('status', 'received');

  if (filters.from) paymentsQuery = paymentsQuery.gte('payment_date', filters.from);
  if (filters.to) paymentsQuery = paymentsQuery.lte('payment_date', `${filters.to}T23:59:59.999Z`);

  const [feesRes, paymentsRes] = await Promise.all([feesQuery, paymentsQuery]);

  if (feesRes.error)
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to generate revenue report');
  if (paymentsRes.error)
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to generate revenue report');

  type FeeRow = {
    category: string;
    total_amount: number;
    amount_paid: number;
    remaining_amount: number;
    status: string;
  };
  type PaymentRow = { amount: number; payment_date: string };

  const fees = (feesRes.data ?? []) as unknown as FeeRow[];
  const payments = (paymentsRes.data ?? []) as unknown as PaymentRow[];

  const totalAgreed = fees.reduce((s, f) => s + f.total_amount, 0);
  const totalRevenue = fees.reduce((s, f) => s + f.amount_paid, 0);
  const totalOutstanding = fees.reduce((s, f) => s + f.remaining_amount, 0);

  const categoryMap = new Map<string, { total_agreed: number; total_collected: number }>();
  for (const f of fees) {
    const entry = categoryMap.get(f.category) ?? { total_agreed: 0, total_collected: 0 };
    entry.total_agreed += f.total_amount;
    entry.total_collected += f.amount_paid;
    categoryMap.set(f.category, entry);
  }

  const now = new Date();
  const monthlyMap = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(key, 0);
  }
  for (const p of payments) {
    const key = p.payment_date.slice(0, 7);
    if (monthlyMap.has(key)) {
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + p.amount);
    }
  }

  return {
    total_revenue: totalRevenue,
    total_agreed: totalAgreed,
    total_outstanding: totalOutstanding,
    by_category: Array.from(categoryMap.entries()).map(([category, v]) => ({
      category,
      total_agreed: v.total_agreed,
      total_collected: v.total_collected,
    })),
    monthly: Array.from(monthlyMap.entries()).map(([month, amount]) => ({ month, amount })),
  };
}

export async function getCounselorPerformance(): Promise<CounselorPerformanceReport> {
  const [employeesRes, leadsRes, studentsRes, tasksRes, followupsRes, paymentsRes] =
    await Promise.all([
      // is_active lives on the users table — join to filter active employees
      supabaseAdmin
        .from('employees')
        .select('user_id, full_name, user:users!user_id(is_active)')
        .is('deleted_at', null),
      supabaseAdmin
        .from('leads')
        .select('assigned_counselor_id, converted_at')
        .is('deleted_at', null),
      supabaseAdmin.from('students').select('assigned_counselor_id').is('deleted_at', null),
      supabaseAdmin
        .from('tasks')
        .select('created_by')
        .is('deleted_at', null)
        .eq('status', 'completed'),
      supabaseAdmin
        .from('follow_ups')
        .select('created_by')
        .is('deleted_at', null)
        .eq('status', 'completed'),
      supabaseAdmin
        .from('payments')
        .select('recorded_by, amount')
        .is('deleted_at', null)
        .eq('status', 'received'),
    ]);

  const results = [employeesRes, leadsRes, studentsRes, tasksRes, followupsRes, paymentsRes];
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    logger.error(
      {
        code: failed.error.code,
        message: failed.error.message,
        details: failed.error.details,
        hint: failed.error.hint,
      },
      'getCounselorPerformance: Supabase query failed',
    );
    throw new AppError(
      'INTERNAL_SERVER_ERROR',
      500,
      'Failed to generate counselor performance report',
    );
  }

  type EmpRow = { user_id: string; full_name: string; user: { is_active: boolean } | null };
  type LeadRow = { assigned_counselor_id: string | null; converted_at: string | null };
  type StudentRow = { assigned_counselor_id: string | null };
  type TaskRow = { created_by: string };
  type FollowupRow = { created_by: string };
  type PaymentRow = { recorded_by: string; amount: number };

  // Only include employees whose linked user is active
  const employees = ((employeesRes.data ?? []) as unknown as EmpRow[]).filter(
    (e) => e.user?.is_active === true,
  );
  const leads = (leadsRes.data ?? []) as unknown as LeadRow[];
  const students = (studentsRes.data ?? []) as unknown as StudentRow[];
  const tasks = (tasksRes.data ?? []) as unknown as TaskRow[];
  const followups = (followupsRes.data ?? []) as unknown as FollowupRow[];
  const payments = (paymentsRes.data ?? []) as unknown as PaymentRow[];

  const counselors: CounselorPerformanceEntry[] = employees.map((emp) => {
    const cId = emp.user_id;
    const leadsAssigned = leads.filter((l) => l.assigned_counselor_id === cId).length;
    const conversions = leads.filter(
      (l) => l.assigned_counselor_id === cId && l.converted_at !== null,
    ).length;
    const studentsManaged = students.filter((s) => s.assigned_counselor_id === cId).length;
    const tasksCompleted = tasks.filter((t) => t.created_by === cId).length;
    const followupsCompleted = followups.filter((f) => f.created_by === cId).length;
    const revenueCollected = payments
      .filter((p) => p.recorded_by === cId)
      .reduce((s, p) => s + p.amount, 0);

    return {
      counselor_id: cId,
      counselor_name: emp.full_name,
      leads_assigned: leadsAssigned,
      students_managed: studentsManaged,
      conversions,
      tasks_completed: tasksCompleted,
      followups_completed: followupsCompleted,
      revenue_collected: revenueCollected,
    };
  });

  return { counselors };
}

export async function getStudentProgressReport(
  filters: ReportDateFilters,
  userId: string,
  isAdmin: boolean,
): Promise<StudentProgressReport> {
  let query = supabaseAdmin
    .from('students')
    .select('student_stage, case_closed_at')
    .is('deleted_at', null);

  if (!isAdmin) {
    query = query.or(`assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`);
  } else if (filters.counselor_id) {
    query = query.eq('assigned_counselor_id', filters.counselor_id);
  }

  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error)
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to generate student progress report');

  type StudentRow = { student_stage: string; case_closed_at: string | null };
  const students = (data ?? []) as unknown as StudentRow[];

  return {
    total: students.length,
    by_stage: countByKey(students, 'student_stage'),
    cases_closed: students.filter((s) => s.case_closed_at !== null).length,
  };
}

export async function getApplicationsReport(
  filters: ReportDateFilters,
): Promise<ApplicationsReport> {
  let query = supabaseAdmin
    .from('university_applications')
    .select('application_status, university_name')
    .is('deleted_at', null);

  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error)
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to generate applications report');

  type AppRow = { application_status: string; university_name: string };
  const apps = (data ?? []) as unknown as AppRow[];

  const universityMap = new Map<string, number>();
  for (const a of apps) {
    universityMap.set(a.university_name, (universityMap.get(a.university_name) ?? 0) + 1);
  }

  return {
    total: apps.length,
    by_status: countByKey(apps, 'application_status'),
    by_university: Array.from(universityMap.entries())
      .map(([university, count]) => ({ university, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
  };
}

export async function getCountryDistributionReport(
  userId: string,
  isAdmin: boolean,
): Promise<CountryDistributionReport> {
  let leadsQ = supabaseAdmin.from('leads').select('country, nationality').is('deleted_at', null);

  let studentsQ = supabaseAdmin.from('students').select('country').is('deleted_at', null);

  if (!isAdmin) {
    leadsQ = leadsQ.or(`assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`);
    studentsQ = studentsQ.or(`assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`);
  }

  const [leadsRes, studentsRes] = await Promise.all([leadsQ, studentsQ]);

  if (leadsRes.error || studentsRes.error) {
    throw new AppError(
      'INTERNAL_SERVER_ERROR',
      500,
      'Failed to generate country distribution report',
    );
  }

  type LeadRow = { country: string | null; nationality: string | null };
  type StudentRow = { country: string | null };

  const leads = (leadsRes.data ?? []) as unknown as LeadRow[];
  const students = (studentsRes.data ?? []) as unknown as StudentRow[];

  const leadsWithCountry = leads.filter((l) => l.country !== null) as Array<{
    country: string;
    nationality: string | null;
  }>;
  const leadsWithNationality = leads.filter((l) => l.nationality !== null) as Array<{
    country: string | null;
    nationality: string;
  }>;
  const studentsWithCountry = students.filter((s) => s.country !== null) as Array<{
    country: string;
  }>;

  return {
    leads_by_country: countByKey(leadsWithCountry, 'country'),
    students_by_country: countByKey(studentsWithCountry, 'country'),
    leads_by_nationality: countByKey(leadsWithNationality, 'nationality'),
  };
}

export async function getTasksReport(
  filters: ReportDateFilters,
  userId: string,
  isAdmin: boolean,
): Promise<TasksReport> {
  let query = supabaseAdmin
    .from('tasks')
    .select('status, priority, due_date')
    .is('deleted_at', null);

  if (!isAdmin) {
    query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
  }

  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to generate tasks report');

  type TaskRow = { status: string; priority: string; due_date: string };
  const tasks = (data ?? []) as unknown as TaskRow[];

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100 * 10) / 10 : 0;

  const nowIso = new Date().toISOString();
  const overdue = tasks.filter(
    (t) => t.due_date < nowIso && t.status !== 'completed' && t.status !== 'cancelled',
  ).length;

  return {
    total,
    by_status: countByKey(tasks, 'status'),
    by_priority: countByKey(tasks, 'priority'),
    completion_rate: completionRate,
    overdue,
  };
}

export async function getFollowUpsReport(
  filters: ReportDateFilters,
  userId: string,
  isAdmin: boolean,
): Promise<FollowUpsReport> {
  let query = supabaseAdmin
    .from('follow_ups')
    .select('status, type, scheduled_at')
    .is('deleted_at', null);

  if (!isAdmin) {
    query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
  }

  if (filters.from) query = query.gte('scheduled_at', filters.from);
  if (filters.to) query = query.lte('scheduled_at', `${filters.to}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error)
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to generate follow-ups report');

  type FollowupRow = { status: string; type: string; scheduled_at: string };
  const followups = (data ?? []) as unknown as FollowupRow[];

  const total = followups.length;
  const completed = followups.filter((f) => f.status === 'completed').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100 * 10) / 10 : 0;

  return {
    total,
    by_status: countByKey(followups, 'status'),
    by_type: countByKey(followups, 'type'),
    completion_rate: completionRate,
    overdue: followups.filter((f) => f.status === 'overdue').length,
  };
}
