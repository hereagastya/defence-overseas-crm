import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/AppError';
import type { UniversityApplication, CreateApplicationInput } from '@doc/shared';

// ── Constants ──────────────────────────────────────────────────────────────────

const APPLICATION_SELECT = `
  id, student_id, university_name, country, course, status,
  applied_at, offer_received_at, offer_responded_at, notes,
  created_by, created_at, updated_at, deleted_at
`.trim();

// ── Repository functions ───────────────────────────────────────────────────────

export async function findAll(studentId: string): Promise<UniversityApplication[]> {
  const { data, error } = await supabaseAdmin
    .from('university_applications')
    .select(APPLICATION_SELECT)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch applications');
  return (data ?? []) as unknown as UniversityApplication[];
}

export async function findById(id: string): Promise<UniversityApplication | null> {
  const { data, error } = await supabaseAdmin
    .from('university_applications')
    .select(APPLICATION_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch application');
  return data as unknown as UniversityApplication | null;
}

export async function create(
  studentId: string,
  input: CreateApplicationInput,
  actorId: string,
): Promise<UniversityApplication> {
  const { data, error } = await supabaseAdmin
    .from('university_applications')
    .insert({
      student_id: studentId,
      university_name: input.university_name,
      country: input.country,
      course: input.course,
      status: input.status,
      applied_at: input.applied_at ?? null,
      notes: input.notes ?? null,
      created_by: actorId,
    })
    .select(APPLICATION_SELECT)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AppError(
        'DUPLICATE_APPLICATION',
        409,
        'An active application for this university already exists for this student',
      );
    }
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to create application');
  }

  return data as unknown as UniversityApplication;
}

export async function update(
  id: string,
  fields: Record<string, unknown>,
): Promise<UniversityApplication> {
  const { data, error } = await supabaseAdmin
    .from('university_applications')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select(APPLICATION_SELECT)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AppError(
        'DUPLICATE_APPLICATION',
        409,
        'An active application for this university already exists',
      );
    }
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to update application');
  }

  return data as unknown as UniversityApplication;
}

export async function softDelete(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('university_applications')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to delete application');
}
