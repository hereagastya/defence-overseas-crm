import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/AppError';
import type { TaskFiltersInput } from '@doc/shared';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TaskWithUsers {
  id: string;
  title: string;
  description: string | null;
  lead_id: string | null;
  student_id: string | null;
  assigned_to: string;
  created_by: string;
  priority: string;
  status: string;
  due_date: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  assigned_to_name: string | null;
  created_by_name: string | null;
}

export interface CreateTaskData {
  title: string;
  description: string | null;
  lead_id: string | null;
  student_id: string | null;
  assigned_to: string;
  created_by: string;
  priority: string;
  due_date: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TASK_SELECT = `
  id, title, description, lead_id, student_id,
  assigned_to, created_by, priority, status, due_date, completed_at,
  created_at, updated_at, deleted_at,
  assignee:users!assigned_to(employee:employees!user_id(full_name)),
  creator:users!created_by(employee:employees!user_id(full_name))
`.trim();

// ── Helpers ───────────────────────────────────────────────────────────────────

type RawTask = {
  id: string;
  title: string;
  description: string | null;
  lead_id: string | null;
  student_id: string | null;
  assigned_to: string;
  created_by: string;
  priority: string;
  status: string;
  due_date: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  assignee: { employee: { full_name: string }[] } | null;
  creator: { employee: { full_name: string }[] } | null;
};

function toTaskWithUsers(raw: RawTask): TaskWithUsers {
  const { assignee, creator, ...fields } = raw;
  return {
    ...(fields as Omit<TaskWithUsers, 'assigned_to_name' | 'created_by_name'>),
    assigned_to_name: assignee?.employee?.[0]?.full_name ?? null,
    created_by_name: creator?.employee?.[0]?.full_name ?? null,
  };
}

// ── Repository functions ───────────────────────────────────────────────────────

export async function findAll(
  filters: TaskFiltersInput,
  userId: string,
  isAdmin: boolean,
): Promise<{ tasks: TaskWithUsers[]; total: number }> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('tasks')
    .select(TASK_SELECT, { count: 'exact' })
    .is('deleted_at', null);

  // Data-level access: non-admin sees only tasks they're assigned to or created
  if (!isAdmin) {
    query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
  }

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
  if (filters.lead_id) query = query.eq('lead_id', filters.lead_id);
  if (filters.student_id) query = query.eq('student_id', filters.student_id);
  if (filters.due_from) query = query.gte('due_date', filters.due_from);
  if (filters.due_to) query = query.lte('due_date', `${filters.due_to}T23:59:59.999Z`);

  if (filters.overdue_only) {
    const now = new Date().toISOString();
    query = query.lt('due_date', now).not('status', 'in', '(completed,cancelled)');
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch tasks');

  return {
    tasks: ((data ?? []) as unknown as RawTask[]).map(toTaskWithUsers),
    total: count ?? 0,
  };
}

export async function findById(id: string): Promise<TaskWithUsers | null> {
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select(TASK_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch task');
  if (!data) return null;

  return toTaskWithUsers(data as unknown as RawTask);
}

export async function create(data: CreateTaskData): Promise<TaskWithUsers> {
  const { data: row, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      title: data.title,
      description: data.description,
      lead_id: data.lead_id,
      student_id: data.student_id,
      assigned_to: data.assigned_to,
      created_by: data.created_by,
      priority: data.priority,
      status: 'open',
      due_date: data.due_date,
    })
    .select(TASK_SELECT)
    .single();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to create task');
  return toTaskWithUsers(row as unknown as RawTask);
}

export async function update(id: string, fields: Record<string, unknown>): Promise<TaskWithUsers> {
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select(TASK_SELECT)
    .single();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to update task');
  return toTaskWithUsers(data as unknown as RawTask);
}

export async function softDelete(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('tasks')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to delete task');
}
