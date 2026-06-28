import type { RequestHandler } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/AppError';
import type { UserRole } from '@doc/shared';

function extractBearerToken(req: Parameters<RequestHandler>[0]): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

/**
 * Verifies the Supabase JWT from the Authorization header.
 * On success, attaches `req.user` with id, email, role, and is_active.
 * Rejects with 401 for missing/invalid/expired tokens and 403 for inactive accounts.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw new AppError('UNAUTHORIZED', 401, 'Authentication token is required');
    }

    // Validate the JWT against Supabase Auth (also catches revoked tokens)
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new AppError('UNAUTHORIZED', 401, 'Invalid or expired authentication token');
    }

    // Fetch the CRM role from our own users table
    const { data: crmUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (dbError || !crmUser) {
      throw new AppError('UNAUTHORIZED', 401, 'User account not found in CRM');
    }

    if (!crmUser.is_active) {
      throw new AppError('ACCOUNT_DEACTIVATED', 403, 'This account has been deactivated');
    }

    req.user = {
      id: user.id,
      email: user.email ?? '',
      role: crmUser.role as UserRole,
      is_active: crmUser.is_active as boolean,
    };

    next();
  } catch (err) {
    next(err);
  }
};
