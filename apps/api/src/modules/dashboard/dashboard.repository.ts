import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/AppError';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  total_leads: number;
  leads_this_month: number;
  total_students: number;
  students_active: number;
  open_tasks: number;
  overdue_tasks: number;
  scheduled_followups: number;
  overdue_followups: number;
}

export interface DashboardKPIs {
  lead_conversion_rate: number;
  leads_this_month: number;
  leads_last_month: number;
  students_this_month: number;
  students_last_month: number;
  tasks_completed_this_month: number;
  followups_completed_this_month: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface DashboardCharts {
  leads_by_stage: ChartDataPoint[];
  leads_by_source: ChartDataPoint[];
  students_by_stage: ChartDataPoint[];
  monthly_revenue: Array<{ month: string; amount: number }>;
}

export interface UpcomingFollowup {
  id: string;
  type: string;
  scheduled_at: string;
  lead_id: string | null;
  student_id: string | null;
  assigned_to: string;
  assigned_to_name: string | null;
  lead_name: string | null;
  student_name: string | null;
}

export interface RecentActivityEntry {
  id: string;
  actor_id: string;
  actor_name: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfMonth(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
}

function startOfLastMonth(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1).toISOString();
}

function endOfLastMonth(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999).toISOString();
}

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

export async function getSummary(userId: string, isAdmin: boolean): Promise<DashboardSummary> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const nowIso = now.toISOString();

  // Build lead count queries
  let totalLeadsQ = supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);
  if (!isAdmin)
    totalLeadsQ = totalLeadsQ.or(
      `assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`,
    );

  let leadsThisMonthQ = supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .gte('created_at', monthStart);
  if (!isAdmin)
    leadsThisMonthQ = leadsThisMonthQ.or(
      `assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`,
    );

  // Build student count queries
  let totalStudentsQ = supabaseAdmin
    .from('students')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);
  if (!isAdmin)
    totalStudentsQ = totalStudentsQ.or(
      `assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`,
    );

  let studentsActiveQ = supabaseAdmin
    .from('students')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .is('case_closed_at', null);
  if (!isAdmin)
    studentsActiveQ = studentsActiveQ.or(
      `assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`,
    );

  // Build task count queries
  let openTasksQ = supabaseAdmin
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .not('status', 'in', '(completed,cancelled)');
  if (!isAdmin) openTasksQ = openTasksQ.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);

  let overdueTasksQ = supabaseAdmin
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .lt('due_date', nowIso)
    .not('status', 'in', '(completed,cancelled)');
  if (!isAdmin)
    overdueTasksQ = overdueTasksQ.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);

  // Build follow-up count queries
  let scheduledFuQ = supabaseAdmin
    .from('follow_ups')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('status', 'scheduled');
  if (!isAdmin) scheduledFuQ = scheduledFuQ.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);

  let overdueFuQ = supabaseAdmin
    .from('follow_ups')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('status', 'overdue');
  if (!isAdmin) overdueFuQ = overdueFuQ.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);

  const [
    totalLeadsRes,
    leadsThisMonthRes,
    totalStudentsRes,
    studentsActiveRes,
    openTasksRes,
    overdueTasksRes,
    scheduledFuRes,
    overdueFuRes,
  ] = await Promise.all([
    totalLeadsQ,
    leadsThisMonthQ,
    totalStudentsQ,
    studentsActiveQ,
    openTasksQ,
    overdueTasksQ,
    scheduledFuQ,
    overdueFuQ,
  ]);

  if (
    totalLeadsRes.error ||
    leadsThisMonthRes.error ||
    totalStudentsRes.error ||
    studentsActiveRes.error ||
    openTasksRes.error ||
    overdueTasksRes.error ||
    scheduledFuRes.error ||
    overdueFuRes.error
  ) {
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Dashboard summary query failed');
  }

  return {
    total_leads: totalLeadsRes.count ?? 0,
    leads_this_month: leadsThisMonthRes.count ?? 0,
    total_students: totalStudentsRes.count ?? 0,
    students_active: studentsActiveRes.count ?? 0,
    open_tasks: openTasksRes.count ?? 0,
    overdue_tasks: overdueTasksRes.count ?? 0,
    scheduled_followups: scheduledFuRes.count ?? 0,
    overdue_followups: overdueFuRes.count ?? 0,
  };
}

export async function getKPIs(userId: string, isAdmin: boolean): Promise<DashboardKPIs> {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfLastMonth(now);
  const lastMonthEnd = endOfLastMonth(now);

  let totalLeadsQ = supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);
  if (!isAdmin)
    totalLeadsQ = totalLeadsQ.or(
      `assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`,
    );

  let totalStudentsQ = supabaseAdmin
    .from('students')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);
  if (!isAdmin)
    totalStudentsQ = totalStudentsQ.or(
      `assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`,
    );

  let leadsThisMonthQ = supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .gte('created_at', thisMonthStart);
  if (!isAdmin)
    leadsThisMonthQ = leadsThisMonthQ.or(
      `assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`,
    );

  let leadsLastMonthQ = supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .gte('created_at', lastMonthStart)
    .lte('created_at', lastMonthEnd);
  if (!isAdmin)
    leadsLastMonthQ = leadsLastMonthQ.or(
      `assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`,
    );

  let studentsThisMonthQ = supabaseAdmin
    .from('students')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .gte('created_at', thisMonthStart);
  if (!isAdmin)
    studentsThisMonthQ = studentsThisMonthQ.or(
      `assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`,
    );

  let studentsLastMonthQ = supabaseAdmin
    .from('students')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .gte('created_at', lastMonthStart)
    .lte('created_at', lastMonthEnd);
  if (!isAdmin)
    studentsLastMonthQ = studentsLastMonthQ.or(
      `assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`,
    );

  let tasksCompletedQ = supabaseAdmin
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('status', 'completed')
    .gte('completed_at', thisMonthStart);
  if (!isAdmin)
    tasksCompletedQ = tasksCompletedQ.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);

  let followupsCompletedQ = supabaseAdmin
    .from('follow_ups')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('status', 'completed')
    .gte('completed_at', thisMonthStart);
  if (!isAdmin)
    followupsCompletedQ = followupsCompletedQ.or(
      `assigned_to.eq.${userId},created_by.eq.${userId}`,
    );

  const [
    totalLeadsRes,
    totalStudentsRes,
    leadsThisMonthRes,
    leadsLastMonthRes,
    studentsThisMonthRes,
    studentsLastMonthRes,
    tasksCompletedRes,
    followupsCompletedRes,
  ] = await Promise.all([
    totalLeadsQ,
    totalStudentsQ,
    leadsThisMonthQ,
    leadsLastMonthQ,
    studentsThisMonthQ,
    studentsLastMonthQ,
    tasksCompletedQ,
    followupsCompletedQ,
  ]);

  if (
    totalLeadsRes.error ||
    totalStudentsRes.error ||
    leadsThisMonthRes.error ||
    leadsLastMonthRes.error ||
    studentsThisMonthRes.error ||
    studentsLastMonthRes.error ||
    tasksCompletedRes.error ||
    followupsCompletedRes.error
  ) {
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Dashboard KPI query failed');
  }

  const totalLeads = totalLeadsRes.count ?? 0;
  const totalStudents = totalStudentsRes.count ?? 0;
  const conversionRate =
    totalLeads > 0 ? Math.round((totalStudents / totalLeads) * 100 * 10) / 10 : 0;

  return {
    lead_conversion_rate: conversionRate,
    leads_this_month: leadsThisMonthRes.count ?? 0,
    leads_last_month: leadsLastMonthRes.count ?? 0,
    students_this_month: studentsThisMonthRes.count ?? 0,
    students_last_month: studentsLastMonthRes.count ?? 0,
    tasks_completed_this_month: tasksCompletedRes.count ?? 0,
    followups_completed_this_month: followupsCompletedRes.count ?? 0,
  };
}

export async function getCharts(userId: string, isAdmin: boolean): Promise<DashboardCharts> {
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();

  let leadsQ = supabaseAdmin.from('leads').select('lead_stage, lead_source').is('deleted_at', null);
  if (!isAdmin)
    leadsQ = leadsQ.or(`assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`);

  let studentsQ = supabaseAdmin.from('students').select('student_stage').is('deleted_at', null);
  if (!isAdmin)
    studentsQ = studentsQ.or(`assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`);

  const paymentsQ = supabaseAdmin
    .from('payments')
    .select('amount, payment_date')
    .is('deleted_at', null)
    .eq('status', 'received')
    .gte('payment_date', twelveMonthsAgo);

  const [leadsRes, studentsRes, paymentsRes] = await Promise.all([leadsQ, studentsQ, paymentsQ]);

  if (leadsRes.error || studentsRes.error || paymentsRes.error) {
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Dashboard charts query failed');
  }

  type LeadRow = { lead_stage: string; lead_source: string };
  type StudentRow = { student_stage: string };
  type PaymentRow = { amount: number; payment_date: string };

  const leads = (leadsRes.data ?? []) as unknown as LeadRow[];
  const students = (studentsRes.data ?? []) as unknown as StudentRow[];
  const payments = (paymentsRes.data ?? []) as unknown as PaymentRow[];

  // Build 12-month revenue map
  const revenueByMonth = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    revenueByMonth.set(key, 0);
  }
  for (const p of payments) {
    const key = p.payment_date.slice(0, 7);
    if (revenueByMonth.has(key)) {
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + p.amount);
    }
  }

  return {
    leads_by_stage: countByKey(leads, 'lead_stage'),
    leads_by_source: countByKey(leads, 'lead_source'),
    students_by_stage: countByKey(students, 'student_stage'),
    monthly_revenue: Array.from(revenueByMonth.entries()).map(([month, amount]) => ({
      month,
      amount,
    })),
  };
}

export async function getUpcomingFollowups(
  userId: string,
  isAdmin: boolean,
): Promise<UpcomingFollowup[]> {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  let query = supabaseAdmin
    .from('follow_ups')
    .select(
      `id, type, scheduled_at, lead_id, student_id, assigned_to,
      assignee:users!assigned_to(employee:employees!user_id(full_name)),
      lead:leads!lead_id(full_name),
      student:students!student_id(full_name)`,
    )
    .is('deleted_at', null)
    .eq('status', 'scheduled')
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', sevenDaysLater)
    .order('scheduled_at', { ascending: true })
    .limit(20);

  if (!isAdmin) {
    query = query.eq('assigned_to', userId);
  }

  const { data, error } = await query;
  if (error)
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch upcoming follow-ups');

  type RawUpcoming = {
    id: string;
    type: string;
    scheduled_at: string;
    lead_id: string | null;
    student_id: string | null;
    assigned_to: string;
    assignee: { employee: { full_name: string }[] } | null;
    lead: { full_name: string } | null;
    student: { full_name: string } | null;
  };

  return ((data ?? []) as unknown as RawUpcoming[]).map((f) => ({
    id: f.id,
    type: f.type,
    scheduled_at: f.scheduled_at,
    lead_id: f.lead_id,
    student_id: f.student_id,
    assigned_to: f.assigned_to,
    assigned_to_name: f.assignee?.employee?.[0]?.full_name ?? null,
    lead_name: f.lead?.full_name ?? null,
    student_name: f.student?.full_name ?? null,
  }));
}

export async function getRecentActivity(
  userId: string,
  isAdmin: boolean,
): Promise<RecentActivityEntry[]> {
  let query = supabaseAdmin
    .from('activity_logs')
    .select(
      `id, actor_id, entity_type, entity_id, action, created_at,
      actor:users!actor_id(employee:employees!user_id(full_name))`,
    )
    .order('created_at', { ascending: false })
    .limit(20);

  if (!isAdmin) {
    query = query.eq('actor_id', userId);
  }

  const { data, error } = await query;
  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch recent activity');

  type RawActivity = {
    id: string;
    actor_id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    created_at: string;
    actor: { employee: { full_name: string }[] } | null;
  };

  return ((data ?? []) as unknown as RawActivity[]).map((a) => ({
    id: a.id,
    actor_id: a.actor_id,
    actor_name: a.actor?.employee?.[0]?.full_name ?? null,
    entity_type: a.entity_type,
    entity_id: a.entity_id,
    action: a.action,
    created_at: a.created_at,
  }));
}
