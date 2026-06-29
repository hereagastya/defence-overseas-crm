import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { env } from '../../config/env';
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

// Creates a throw-away client for signInWithPassword so the shared supabaseAdmin
// singleton is never given a user session. GoTrueClient._saveSession stores the
// returned JWT in memory even with persistSession: false, which would cause every
// subsequent supabaseAdmin.from() call to send the user's token instead of the
// service-role key — RLS would be enforced instead of bypassed.
function createAuthClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function login(input: LoginInput): Promise<LoginResult> {
  // DEBUG — remove after diagnosis
  logger.debug(
    { email: input.email, supabaseUrl: env.SUPABASE_URL },
    '[login:debug] calling signInWithPassword',
  );
  // eslint-disable-next-line no-console
  console.error('[login:debug] email=%s  url=%s', input.email, env.SUPABASE_URL);

  const authClient = createAuthClient();
  const { data, error } = await authClient.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.session || !data.user) {
    // DEBUG — log the raw Supabase error so we know what actually failed
    logger.error(
      { supabaseError: error, hasSession: !!data?.session, hasUser: !!data?.user },
      '[login:debug] signInWithPassword returned error or missing session/user',
    );
    // eslint-disable-next-line no-console
    console.error('[login:debug] Supabase error:', JSON.stringify(error, null, 2));
    throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
  }

  const { data: userRow, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, role, is_active')
    .eq('id', data.user.id)
    .single();

  if (userError || !userRow) {
    logger.error(
      { error: userError, userId: data.user.id },
      'CRM user profile missing after successful Supabase auth — handle_new_auth_user trigger may not have fired',
    );
    throw new AppError(
      'INTERNAL_SERVER_ERROR',
      500,
      'User profile not found. Contact your administrator.',
    );
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

  // Fire-and-forget — does not block the response
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
  const authClient = createAuthClient();
  const { error: verifyError } = await authClient.auth.signInWithPassword({
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
    logger.error({ error: updateError, userId }, 'Failed to update password via admin API');
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
