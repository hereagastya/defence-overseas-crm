import { supabaseAdmin } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/AppError';
import { logActivity } from '../../database/activityLogger';
import type { LoginInput, ChangePasswordInput } from '@doc/shared';

export interface LoginResult {
  token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email: string;
    role: string;
    is_active: boolean;
    full_name: string | null;
    employee_id: string | null;
  };
}

export interface SessionProfile {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  employee: {
    id: string;
    full_name: string;
    phone: string;
    designation: string | null;
    avatar_url: string | null;
    created_at: string;
  } | null;
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.session || !data.user) {
    throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
  }

  const { data: userRow, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, role, is_active')
    .eq('id', data.user.id)
    .single();

  if (userError || !userRow) {
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'User record not found');
  }

  const user = userRow as { id: string; email: string; role: string; is_active: boolean };

  if (!user.is_active) {
    throw new AppError(
      'ACCOUNT_DEACTIVATED',
      403,
      'Your account has been deactivated. Contact an administrator.',
    );
  }

  const { data: empRow } = await supabaseAdmin
    .from('employees')
    .select('id, full_name')
    .eq('user_id', data.user.id)
    .maybeSingle();

  const emp = empRow as { id: string; full_name: string } | null;

  // Update last_login_at without blocking the response
  supabaseAdmin
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.user.id)
    .then(({ error: e }) => {
      if (e) logger.warn({ error: e }, 'Failed to update last_login_at');
    });

  logActivity({
    actor_id: user.id,
    entity_type: 'user',
    entity_id: user.id,
    action: 'login',
    metadata: { email: user.email },
  });

  return {
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at ?? 0,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      full_name: emp?.full_name ?? null,
      employee_id: emp?.id ?? null,
    },
  };
}

export async function logout(accessToken: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin.auth.admin as any).signOut(accessToken, 'global');
  if (error) {
    logger.warn({ error }, 'Failed to revoke user sessions on logout');
  }
}

export async function getSessionProfile(userId: string): Promise<SessionProfile> {
  const { data: userRow, error } = await supabaseAdmin
    .from('users')
    .select('id, email, role, is_active, last_login_at, created_at')
    .eq('id', userId)
    .single();

  if (error || !userRow) {
    throw new AppError('UNAUTHORIZED', 401, 'User not found');
  }

  const { data: empRow } = await supabaseAdmin
    .from('employees')
    .select('id, full_name, phone, designation, avatar_url, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  const base = userRow as Omit<SessionProfile, 'employee'>;
  const emp = (empRow as SessionProfile['employee']) ?? null;

  return { ...base, employee: emp };
}

export async function changePassword(
  userId: string,
  email: string,
  accessToken: string,
  input: ChangePasswordInput,
): Promise<void> {
  const { error: verifyError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password: input.current_password,
  });

  if (verifyError) {
    throw new AppError('INVALID_CREDENTIALS', 401, 'Current password is incorrect');
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: input.new_password,
  });

  if (updateError) {
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to update password');
  }

  logActivity({
    actor_id: userId,
    entity_type: 'user',
    entity_id: userId,
    action: 'password_changed',
  });

  // Revoke all sessions so the user must log in again with the new password
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: signOutError } = await (supabaseAdmin.auth.admin as any).signOut(
    accessToken,
    'global',
  );
  if (signOutError) {
    logger.warn({ error: signOutError }, 'Failed to revoke sessions after password change');
  }
}
