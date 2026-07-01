import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import type { StudentWithCounselor, StudentFiltersInput } from '@doc/shared';

// ── Types ──────────────────────────────────────────────────────────────────────

type RawEmployeeRef = { full_name: string };
type RawCounselorRef = { email: string; employee: RawEmployeeRef[] };

type RawStudent = {
  id: string;
  lead_id: string;
  full_name: string;
  email: string | null;
  phone: string;
  date_of_birth: string | null;
  country: string | null;
  nationality: string | null;
  course: string | null;
  passport_number: string | null;
  student_stage: string;
  lead_score: string;
  assigned_counselor_id: string | null;
  case_closed_at: string | null;
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

const STUDENT_SELECT = `
  id, lead_id, full_name, email, phone, date_of_birth, country, nationality,
  course, passport_number, student_stage, lead_score,
  assigned_counselor_id, case_closed_at, created_at, updated_at, deleted_at,
  counselor:users!assigned_counselor_id(
    email,
    employee:employees!user_id(full_name)
  )
`.trim();

const ALLOWED_SORT_COLUMNS = new Set([
  'created_at',
  'updated_at',
  'full_name',
  'student_stage',
  'lead_score',
]);

const ACTIVITY_SELECT = `
  id, actor_id, entity_type, entity_id, action,
  previous_value, new_value, metadata, created_at,
  actor:users!actor_id(employee:employees!user_id(full_name))
`.trim();

// ── Helpers ───────────────────────────────────────────────────────────────────

function toStudentWithCounselor(raw: RawStudent): StudentWithCounselor {
  const { counselor, ...fields } = raw;
  return {
    ...(fields as Omit<StudentWithCounselor, 'counselor_name' | 'counselor_email'>),
    counselor_name: counselor?.employee?.[0]?.full_name ?? null,
    counselor_email: counselor?.email ?? null,
  };
}

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

function toActivityEntry(a: RawActivity): ActivityEntry {
  return {
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
  };
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

function toNoteEntry(n: RawNote): NoteEntry {
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

const NOTE_SELECT = `
  id, content, lead_id, student_id, created_by, created_at, updated_at,
  author:users!created_by(employee:employees!user_id(full_name))
`.trim();

// ── Repository functions ───────────────────────────────────────────────────────

export async function findAll(
  filters: StudentFiltersInput,
  userId: string,
  isAdmin: boolean,
): Promise<{ students: StudentWithCounselor[]; total: number }> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;
  const offset = (page - 1) * limit;
  const sortColumn = ALLOWED_SORT_COLUMNS.has(filters.sort_by ?? '')
    ? filters.sort_by!
    : 'created_at';
  const ascending = (filters.sort_order ?? 'desc') === 'asc';

  let query = supabaseAdmin
    .from('students')
    .select(STUDENT_SELECT, { count: 'exact' })
    .is('deleted_at', null);

  // Data-level access control — mirrors the visibility rule for non-admin users
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

  if (filters.stage) query = query.eq('student_stage', filters.stage);
  if (filters.counselor_id) query = query.eq('assigned_counselor_id', filters.counselor_id);
  if (filters.country) query = query.ilike('country', `%${filters.country}%`);
  if (filters.is_case_closed === true) query = query.not('case_closed_at', 'is', null);
  if (filters.is_case_closed === false) query = query.is('case_closed_at', null);

  const { data, error, count } = await query
    .order(sortColumn, { ascending })
    .range(offset, offset + limit - 1);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch students');

  return {
    students: ((data ?? []) as unknown as RawStudent[]).map(toStudentWithCounselor),
    total: count ?? 0,
  };
}

export async function findById(id: string): Promise<StudentWithCounselor | null> {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select(STUDENT_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch student');
  if (!data) return null;

  return toStudentWithCounselor(data as unknown as RawStudent);
}

export async function update(
  id: string,
  fields: Record<string, unknown>,
): Promise<StudentWithCounselor> {
  const { data, error } = await supabaseAdmin
    .from('students')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select(STUDENT_SELECT)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AppError('CONFLICT', 409, 'A student with this phone number already exists');
    }
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to update student');
  }

  return toStudentWithCounselor(data as unknown as RawStudent);
}

export async function findNotes(studentId: string): Promise<NoteEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('notes')
    .select(NOTE_SELECT)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch notes');

  return ((data ?? []) as unknown as RawNote[]).map(toNoteEntry);
}

export async function createNote(
  studentId: string,
  content: string,
  actorId: string,
): Promise<NoteEntry> {
  const { data, error } = await supabaseAdmin
    .from('notes')
    .insert({ content, student_id: studentId, created_by: actorId })
    .select(NOTE_SELECT)
    .single();

  if (error) {
    logger.error(
      { code: error.code, message: error.message, details: error.details, hint: error.hint },
      'createNote (student): Supabase insert failed',
    );
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to create note');
  }

  return toNoteEntry(data as unknown as RawNote);
}

export async function findActivity(studentId: string): Promise<ActivityEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('activity_logs')
    .select(ACTIVITY_SELECT)
    .eq('entity_type', 'student')
    .eq('entity_id', studentId)
    .order('created_at', { ascending: false });

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch activity log');

  return ((data ?? []) as unknown as RawActivity[]).map(toActivityEntry);
}

// Timeline = student activity + originating lead activity, merged chronologically.
export async function findTimeline(studentId: string, leadId: string): Promise<ActivityEntry[]> {
  const [studentResult, leadResult] = await Promise.all([
    supabaseAdmin
      .from('activity_logs')
      .select(ACTIVITY_SELECT)
      .eq('entity_type', 'student')
      .eq('entity_id', studentId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('activity_logs')
      .select(ACTIVITY_SELECT)
      .eq('entity_type', 'lead')
      .eq('entity_id', leadId)
      .order('created_at', { ascending: false }),
  ]);

  if (studentResult.error)
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch student timeline');
  if (leadResult.error)
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch lead timeline');

  const combined = [
    ...((studentResult.data ?? []) as unknown as RawActivity[]).map(toActivityEntry),
    ...((leadResult.data ?? []) as unknown as RawActivity[]).map(toActivityEntry),
  ];

  combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return combined;
}
