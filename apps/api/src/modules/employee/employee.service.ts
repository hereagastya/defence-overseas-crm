import { supabaseAdmin } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/AppError';
import { logActivity } from '../../database/activityLogger';
import * as employeeRepo from './employee.repository';
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  ResetPasswordInput,
  EmployeeWithUser,
} from '@doc/shared';

export async function listEmployees(): Promise<EmployeeWithUser[]> {
  return employeeRepo.findAll();
}

export async function getEmployee(id: string): Promise<EmployeeWithUser> {
  const employee = await employeeRepo.findById(id);
  if (!employee) {
    throw new AppError('EMPLOYEE_NOT_FOUND', 404, 'Employee not found');
  }
  return employee;
}

export async function createEmployee(
  input: CreateEmployeeInput,
  actorId: string,
): Promise<EmployeeWithUser> {
  // 1. Create Supabase Auth user — the handle_new_auth_user trigger
  //    creates the public.users row using role from user_metadata
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.temp_password,
    email_confirm: true,
    user_metadata: {
      role: input.role,
      full_name: input.full_name,
    },
  });

  if (authError || !authData.user) {
    if (authError?.message?.toLowerCase().includes('already been registered')) {
      throw new AppError('CONFLICT', 409, 'An account with this email already exists');
    }
    throw new AppError(
      'INTERNAL_SERVER_ERROR',
      500,
      `Failed to create auth user: ${authError?.message}`,
    );
  }

  const userId = authData.user.id;

  // 2. Create employee profile row
  const { error: empError } = await supabaseAdmin.from('employees').insert({
    user_id: userId,
    full_name: input.full_name,
    phone: input.phone,
    designation: input.designation ?? null,
  });

  if (empError) {
    // Roll back — delete the auth user to avoid orphan
    await supabaseAdmin.auth.admin.deleteUser(userId).catch((e) => {
      logger.error(
        { error: e, userId },
        'Failed to roll back auth user after employee insert failure',
      );
    });

    if (empError.code === '23505') {
      throw new AppError(
        'DUPLICATE_PHONE',
        409,
        'An employee with this phone number already exists',
      );
    }
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to create employee profile');
  }

  const employee = await employeeRepo.findByUserId(userId);
  if (!employee) {
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Employee created but could not be retrieved');
  }

  logActivity({
    actor_id: actorId,
    entity_type: 'employee',
    entity_id: employee.id,
    action: 'created',
    new_value: { email: input.email, role: input.role, full_name: input.full_name },
  });

  return employee;
}

export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput,
  actorId: string,
): Promise<EmployeeWithUser> {
  const existing = await employeeRepo.findById(id);
  if (!existing) {
    throw new AppError('EMPLOYEE_NOT_FOUND', 404, 'Employee not found');
  }

  // Update employee profile fields
  const profileFields: { full_name?: string; phone?: string; designation?: string | null } = {};
  if (input.full_name !== undefined) profileFields.full_name = input.full_name;
  if (input.phone !== undefined) profileFields.phone = input.phone;
  if (input.designation !== undefined) profileFields.designation = input.designation;

  if (Object.keys(profileFields).length > 0) {
    await employeeRepo.updateProfile(id, profileFields);
  }

  // Update auth-level fields (role, is_active) on public.users
  if (input.role !== undefined || input.is_active !== undefined) {
    const dbUpdates: { role?: string; is_active?: boolean } = {};
    if (input.role !== undefined) dbUpdates.role = input.role;
    if (input.is_active !== undefined) dbUpdates.is_active = input.is_active;

    const { error: userDbError } = await supabaseAdmin
      .from('users')
      .update(dbUpdates)
      .eq('id', existing.user_id);

    if (userDbError) {
      throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to update user record');
    }
  }

  const updated = await employeeRepo.findById(id);
  if (!updated) {
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Employee updated but could not be retrieved');
  }

  logActivity({
    actor_id: actorId,
    entity_type: 'employee',
    entity_id: id,
    action: 'updated',
    previous_value: {
      role: existing.role,
      is_active: existing.is_active,
      full_name: existing.full_name,
      phone: existing.phone,
    },
    new_value: {
      role: updated.role,
      is_active: updated.is_active,
      full_name: updated.full_name,
      phone: updated.phone,
    },
  });

  return updated;
}

export async function deactivateEmployee(id: string, actorId: string): Promise<void> {
  const employee = await employeeRepo.findById(id);
  if (!employee) {
    throw new AppError('EMPLOYEE_NOT_FOUND', 404, 'Employee not found');
  }

  if (employee.user_id === actorId) {
    throw new AppError('CANNOT_DEACTIVATE_SELF', 400, 'You cannot deactivate your own account');
  }

  // Check for active student assignments
  const { count, error: countError } = await supabaseAdmin
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_counselor_id', employee.user_id)
    .is('deleted_at', null)
    .is('case_closed_at', null);

  if (countError) {
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to check student assignments');
  }

  if ((count ?? 0) > 0) {
    throw new AppError(
      'USER_HAS_ACTIVE_ASSIGNMENTS',
      409,
      `This employee has ${count} active student(s) assigned. Reassign them before deactivating.`,
    );
  }

  // Deactivate: set is_active = false on users, soft-delete employee row
  const { error: userError } = await supabaseAdmin
    .from('users')
    .update({ is_active: false })
    .eq('id', employee.user_id);

  if (userError) {
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to deactivate user');
  }

  await employeeRepo.softDelete(id);

  logActivity({
    actor_id: actorId,
    entity_type: 'employee',
    entity_id: id,
    action: 'deactivated',
    previous_value: { is_active: true },
    new_value: { is_active: false },
  });
}

export async function resetPassword(
  id: string,
  input: ResetPasswordInput,
  actorId: string,
): Promise<void> {
  const employee = await employeeRepo.findById(id);
  if (!employee) {
    throw new AppError('EMPLOYEE_NOT_FOUND', 404, 'Employee not found');
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(employee.user_id, {
    password: input.new_password,
  });

  if (error) {
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to reset password');
  }

  logActivity({
    actor_id: actorId,
    entity_type: 'employee',
    entity_id: id,
    action: 'password_reset',
    metadata: { reset_by: actorId },
  });
}
