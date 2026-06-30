import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import { LeadStage } from '@doc/shared';
import type { LeadWithCounselor, CreateLeadInput, LeadFiltersInput } from '@doc/shared';

// ── Types ─────────────────────────────────────────────────────────────────────

type RawEmployeeRef = { full_name: string };
type RawCounselorRef = { email: string; employee: RawEmployeeRef[] };

type RawLead = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  country: string | null;
  nationality: string | null;
  course: string | null;
  passport_number: string | null;
  lead_source: string;
  lead_stage: string;
  lead_status: string;
  lead_score: string;
  assigned_counselor_id: string | null;
  converted_at: string | null;
  converted_to_student_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  counselor: RawCounselorRef | null;
};

export interface ActivityEntry {
  id: string;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor_name: string | null;
}

export interface NoteEntry {
  id: string;
  content: string;
  lead_id: string | null;
  student_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  author_name: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────

// Selects all public Lead fields and joins counselor info from users → employees.
// meta_lead_id is intentionally excluded (internal webhook field, not in Lead type).
const LEAD_SELECT = `
  id, full_name, email, phone, country, nationality, course, passport_number,
  lead_source, lead_stage, lead_status, lead_score,
  assigned_counselor_id, converted_at, converted_to_student_id,
  notes, created_at, updated_at, deleted_at,
  counselor:users!assigned_counselor_id(
    email,
    employee:employees!user_id(full_name)
  )
`.trim();

const ALLOWED_SORT_COLUMNS = new Set([
  'created_at',
  'updated_at',
  'full_name',
  'lead_stage',
  'lead_score',
  'lead_status',
  'lead_source',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLeadWithCounselor(raw: RawLead): LeadWithCounselor {
  const { counselor, ...fields } = raw;
  return {
    ...(fields as Omit<LeadWithCounselor, 'counselor_name' | 'counselor_email'>),
    counselor_name: counselor?.employee?.[0]?.full_name ?? null,
    counselor_email: counselor?.email ?? null,
  };
}

// ── Repository functions ───────────────────────────────────────────────────────

export async function findAll(
  filters: LeadFiltersInput,
  userId: string,
  isAdmin: boolean,
): Promise<{ leads: LeadWithCounselor[]; total: number }> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;
  const offset = (page - 1) * limit;
  const sortColumn = ALLOWED_SORT_COLUMNS.has(filters.sort_by ?? '')
    ? filters.sort_by!
    : 'created_at';
  const ascending = (filters.sort_order ?? 'desc') === 'asc';

  let query = supabaseAdmin
    .from('leads')
    .select(LEAD_SELECT, { count: 'exact' })
    .is('deleted_at', null);

  // Data-level access control — mirrors the RLS policy for non-admin users
  if (!isAdmin) {
    query = query.or(`assigned_counselor_id.eq.${userId},assigned_counselor_id.is.null`);
  }

  // Full-text search across key fields
  if (filters.search) {
    const term = filters.search.replace(/[(),]/g, ' ').trim();
    if (term) {
      query = query.or(
        `full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,course.ilike.%${term}%`,
      );
    }
  }

  // Enum filters
  if (filters.stage) query = query.eq('lead_stage', filters.stage);
  if (filters.status) query = query.eq('lead_status', filters.status);
  if (filters.score) query = query.eq('lead_score', filters.score);
  if (filters.source) query = query.eq('lead_source', filters.source);

  // Other filters
  if (filters.counselor_id) query = query.eq('assigned_counselor_id', filters.counselor_id);
  if (filters.country) query = query.ilike('country', `%${filters.country}%`);
  if (filters.date_from) query = query.gte('created_at', filters.date_from);
  if (filters.date_to) query = query.lte('created_at', `${filters.date_to}T23:59:59.999Z`);

  const { data, error, count } = await query
    .order(sortColumn, { ascending })
    .range(offset, offset + limit - 1);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch leads');

  return {
    leads: ((data ?? []) as unknown as RawLead[]).map(toLeadWithCounselor),
    total: count ?? 0,
  };
}

export async function findById(id: string): Promise<LeadWithCounselor | null> {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select(LEAD_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch lead');
  if (!data) return null;

  return toLeadWithCounselor(data as unknown as RawLead);
}

export async function create(
  input: CreateLeadInput & { meta_lead_id?: string },
): Promise<LeadWithCounselor> {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({
      full_name: input.full_name,
      email: input.email || null,
      phone: input.phone,
      country: input.country ?? null,
      nationality: input.nationality ?? null,
      course: input.course ?? null,
      passport_number: input.passport_number ?? null,
      lead_source: input.lead_source,
      lead_stage: input.lead_stage ?? LeadStage.NEW_INQUIRY,
      lead_status: input.lead_status,
      lead_score: input.lead_score,
      assigned_counselor_id: input.assigned_counselor_id ?? null,
      meta_lead_id: input.meta_lead_id ?? null,
      notes: input.notes ?? null,
    })
    .select(LEAD_SELECT)
    .single();

  if (error) {
    if (error.code === '23505') {
      if (error.message.includes('uq_leads_phone_active') || error.message.includes('phone')) {
        throw new AppError('CONFLICT', 409, 'A lead with this phone number already exists');
      }
      if (error.message.includes('meta_lead_id')) {
        throw new AppError('CONFLICT', 409, 'This Meta lead has already been imported');
      }
    }
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to create lead');
  }

  return toLeadWithCounselor(data as unknown as RawLead);
}

export async function update(
  id: string,
  fields: Record<string, unknown>,
): Promise<LeadWithCounselor> {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select(LEAD_SELECT)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AppError('CONFLICT', 409, 'A lead with this phone number already exists');
    }
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to update lead');
  }

  return toLeadWithCounselor(data as unknown as RawLead);
}

export async function softDelete(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('leads')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to delete lead');
}

export async function markConverted(id: string, studentId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('leads')
    .update({
      lead_stage: LeadStage.CONVERTED_TO_STUDENT,
      converted_at: new Date().toISOString(),
      converted_to_student_id: studentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error)
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to update lead after conversion');
}

export async function findNotes(leadId: string): Promise<NoteEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('notes')
    .select(
      `
      id, content, lead_id, student_id, created_by, created_at, updated_at,
      author:users!created_by(employee:employees!user_id(full_name))
    `,
    )
    .eq('lead_id', leadId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch notes');

  type RawNote = {
    id: string;
    content: string;
    lead_id: string | null;
    student_id: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    author: { employee: { full_name: string }[] } | null;
  };

  return ((data ?? []) as unknown as RawNote[]).map((n) => ({
    id: n.id,
    content: n.content,
    lead_id: n.lead_id,
    student_id: n.student_id,
    created_by: n.created_by,
    created_at: n.created_at,
    updated_at: n.updated_at,
    author_name: n.author?.employee?.[0]?.full_name ?? null,
  }));
}

export async function createNote(
  leadId: string,
  content: string,
  actorId: string,
): Promise<NoteEntry> {
  const { data, error } = await supabaseAdmin
    .from('notes')
    .insert({ content, lead_id: leadId, created_by: actorId })
    .select(
      `
      id, content, lead_id, student_id, created_by, created_at, updated_at,
      author:users!created_by(employee:employees!user_id(full_name))
    `,
    )
    .single();

  if (error) {
    logger.error(
      { code: error.code, message: error.message, details: error.details, hint: error.hint },
      'createNote: Supabase insert failed',
    );
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to create note');
  }

  type RawNote = {
    id: string;
    content: string;
    lead_id: string | null;
    student_id: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    author: { employee: { full_name: string }[] } | null;
  };

  const n = data as unknown as RawNote;
  return {
    id: n.id,
    content: n.content,
    lead_id: n.lead_id,
    student_id: n.student_id,
    created_by: n.created_by,
    created_at: n.created_at,
    updated_at: n.updated_at,
    author_name: n.author?.employee?.[0]?.full_name ?? null,
  };
}

export async function findActivity(leadId: string): Promise<ActivityEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('activity_logs')
    .select(
      `
      id, actor_id, entity_type, entity_id, action,
      previous_value, new_value, metadata, created_at,
      actor:users!actor_id(employee:employees!user_id(full_name))
    `,
    )
    .eq('entity_type', 'lead')
    .eq('entity_id', leadId)
    .order('created_at', { ascending: false });

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch activity log');

  type RawActivity = {
    id: string;
    actor_id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    previous_value: Record<string, unknown> | null;
    new_value: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    actor: { employee: { full_name: string }[] } | null;
  };

  return ((data ?? []) as unknown as RawActivity[]).map((a) => ({
    id: a.id,
    actor_id: a.actor_id,
    entity_type: a.entity_type,
    entity_id: a.entity_id,
    action: a.action,
    previous_value: a.previous_value,
    new_value: a.new_value,
    metadata: a.metadata,
    created_at: a.created_at,
    actor_name: a.actor?.employee?.[0]?.full_name ?? null,
  }));
}
