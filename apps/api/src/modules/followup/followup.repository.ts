import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/AppError';
import type { FollowupFiltersInput } from '@doc/shared';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FollowupWithUsers {
  id: string;
  type: string;
  lead_id: string | null;
  student_id: string | null;
  assigned_to: string;
  created_by: string;
  scheduled_at: string;
  status: string;
  outcome: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  assigned_to_name: string | null;
  created_by_name: string | null;
}

export interface CreateFollowupData {
  type: string;
  lead_id: string | null;
  student_id: string | null;
  assigned_to: string;
  created_by: string;
  scheduled_at: string;
  notes: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const FOLLOWUP_SELECT = `
  id, type, lead_id, student_id,
  assigned_to, created_by, scheduled_at, status, outcome, completed_at, notes,
  created_at, updated_at, deleted_at,
  assignee:users!assigned_to(employee:employees!user_id(full_name)),
  creator:users!created_by(employee:employees!user_id(full_name))
`.trim();

// ── Helpers ───────────────────────────────────────────────────────────────────

type RawFollowup = {
  id: string;
  type: string;
  lead_id: string | null;
  student_id: string | null;
  assigned_to: string;
  created_by: string;
  scheduled_at: string;
  status: string;
  outcome: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  assignee: { employee: { full_name: string }[] } | null;
  creator: { employee: { full_name: string }[] } | null;
};

function toFollowupWithUsers(raw: RawFollowup): FollowupWithUsers {
  const { assignee, creator, ...fields } = raw;
  return {
    ...(fields as Omit<FollowupWithUsers, 'assigned_to_name' | 'created_by_name'>),
    assigned_to_name: assignee?.employee?.[0]?.full_name ?? null,
    created_by_name: creator?.employee?.[0]?.full_name ?? null,
  };
}

// ── Repository functions ───────────────────────────────────────────────────────

export async function findAll(
  filters: FollowupFiltersInput,
  userId: string,
  isAdmin: boolean,
): Promise<{ followups: FollowupWithUsers[]; total: number }> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('follow_ups')
    .select(FOLLOWUP_SELECT, { count: 'exact' })
    .is('deleted_at', null);

  // Data-level access: non-admin sees only follow-ups they're assigned to or created
  if (!isAdmin) {
    query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
  }

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
  if (filters.lead_id) query = query.eq('lead_id', filters.lead_id);
  if (filters.student_id) query = query.eq('student_id', filters.student_id);
  if (filters.date_from) query = query.gte('scheduled_at', filters.date_from);
  if (filters.date_to) query = query.lte('scheduled_at', `${filters.date_to}T23:59:59.999Z`);

  if (filters.overdue_only) {
    const now = new Date().toISOString();
    query = query.lt('scheduled_at', now).not('status', 'in', '(completed,cancelled)');
  }

  const { data, error, count } = await query
    .order('scheduled_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch follow-ups');

  return {
    followups: ((data ?? []) as unknown as RawFollowup[]).map(toFollowupWithUsers),
    total: count ?? 0,
  };
}

export async function findById(id: string): Promise<FollowupWithUsers | null> {
  const { data, error } = await supabaseAdmin
    .from('follow_ups')
    .select(FOLLOWUP_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch follow-up');
  if (!data) return null;

  return toFollowupWithUsers(data as unknown as RawFollowup);
}

export async function create(data: CreateFollowupData): Promise<FollowupWithUsers> {
  const { data: row, error } = await supabaseAdmin
    .from('follow_ups')
    .insert({
      type: data.type,
      lead_id: data.lead_id,
      student_id: data.student_id,
      assigned_to: data.assigned_to,
      created_by: data.created_by,
      scheduled_at: data.scheduled_at,
      status: 'scheduled',
      notes: data.notes,
    })
    .select(FOLLOWUP_SELECT)
    .single();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to create follow-up');
  return toFollowupWithUsers(row as unknown as RawFollowup);
}

export async function update(
  id: string,
  fields: Record<string, unknown>,
): Promise<FollowupWithUsers> {
  const { data, error } = await supabaseAdmin
    .from('follow_ups')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select(FOLLOWUP_SELECT)
    .single();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to update follow-up');
  return toFollowupWithUsers(data as unknown as RawFollowup);
}

export async function softDelete(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('follow_ups')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to delete follow-up');
}

/** Bulk-marks scheduled follow-ups whose scheduled_at is in the past as overdue. */
export async function markOverdue(): Promise<void> {
  const now = new Date().toISOString();
  await supabaseAdmin
    .from('follow_ups')
    .update({ status: 'overdue', updated_at: now })
    .eq('status', 'scheduled')
    .lt('scheduled_at', now)
    .is('deleted_at', null);
}
