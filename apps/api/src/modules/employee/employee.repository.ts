import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/AppError';
import type { EmployeeWithUser } from '@doc/shared';

type RawEmployee = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  designation: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user: {
    id: string;
    email: string;
    role: string;
    is_active: boolean;
    last_login_at: string | null;
  };
};

const EMPLOYEE_SELECT = `
  id, user_id, full_name, phone, designation, avatar_url, created_at, updated_at, deleted_at,
  user:users!user_id(id, email, role, is_active, last_login_at)
`.trim();

async function buildCountMap(): Promise<Map<string, number>> {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('assigned_counselor_id')
    .is('deleted_at', null)
    .not('assigned_counselor_id', 'is', null);

  if (error)
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to count student assignments');

  const map = new Map<string, number>();
  for (const row of (data ?? []) as { assigned_counselor_id: string }[]) {
    map.set(row.assigned_counselor_id, (map.get(row.assigned_counselor_id) ?? 0) + 1);
  }
  return map;
}

function toEmployeeWithUser(raw: RawEmployee, studentCount: number): EmployeeWithUser {
  return {
    id: raw.id,
    user_id: raw.user_id,
    full_name: raw.full_name,
    phone: raw.phone,
    designation: raw.designation,
    avatar_url: raw.avatar_url,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    deleted_at: raw.deleted_at,
    email: raw.user.email,
    role: raw.user.role as EmployeeWithUser['role'],
    is_active: raw.user.is_active,
    assigned_students_count: studentCount,
  };
}

export async function findAll(): Promise<EmployeeWithUser[]> {
  const [{ data, error }, countMap] = await Promise.all([
    supabaseAdmin
      .from('employees')
      .select(EMPLOYEE_SELECT)
      .is('deleted_at', null)
      .order('full_name', { ascending: true }),
    buildCountMap(),
  ]);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch employees');

  return ((data ?? []) as unknown as RawEmployee[]).map((emp) =>
    toEmployeeWithUser(emp, countMap.get(emp.user_id) ?? 0),
  );
}

export async function findById(id: string): Promise<EmployeeWithUser | null> {
  const [{ data, error }, countMap] = await Promise.all([
    supabaseAdmin
      .from('employees')
      .select(EMPLOYEE_SELECT)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle(),
    buildCountMap(),
  ]);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch employee');
  if (!data) return null;

  const emp = data as unknown as RawEmployee;
  return toEmployeeWithUser(emp, countMap.get(emp.user_id) ?? 0);
}

export async function findByUserId(userId: string): Promise<EmployeeWithUser | null> {
  const [{ data, error }, countMap] = await Promise.all([
    supabaseAdmin
      .from('employees')
      .select(EMPLOYEE_SELECT)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle(),
    buildCountMap(),
  ]);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to fetch employee');
  if (!data) return null;

  const emp = data as unknown as RawEmployee;
  return toEmployeeWithUser(emp, countMap.get(emp.user_id) ?? 0);
}

export async function updateProfile(
  id: string,
  fields: { full_name?: string; phone?: string; designation?: string | null },
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('employees')
    .update(fields)
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to update employee');
}

export async function softDelete(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('employees')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to deactivate employee');
}
