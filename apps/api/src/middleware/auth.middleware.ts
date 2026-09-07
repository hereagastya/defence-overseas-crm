import * as crypto from 'crypto';
import type { RequestHandler } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';
import type { UserRole } from '@doc/shared';

function extractBearerToken(req: Parameters<RequestHandler>[0]): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

interface JWTPayload {
  sub: string;
  email?: string;
  exp?: number;
}

/**
 * Verifies a Supabase HS256 JWT locally using SUPABASE_JWT_SECRET.
 * This avoids calling supabaseAdmin.auth.getUser(token), which writes to the
 * GoTrueClient's in-memory session and causes subsequent supabaseAdmin PostgREST
 * queries to send the user's JWT (activating RLS) instead of the service-role key.
 */
function verifySupabaseJWT(token: string): JWTPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  // Recompute the expected signature
  const expectedSig = crypto
    .createHmac('sha256', env.SUPABASE_JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  // Constant-time comparison (prevent timing attacks)
  const expectedBytes = Buffer.from(expectedSig, 'base64url');
  const actualBytes = Buffer.from(signatureB64, 'base64url');
  if (
    expectedBytes.length !== actualBytes.length ||
    !crypto.timingSafeEqual(expectedBytes, actualBytes)
  ) {
    return null;
  }

  let payload: JWTPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as JWTPayload;
  } catch {
    return null;
  }

  // Check expiry
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  if (!payload.sub) return null;

  return payload;
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

    // Verify the JWT locally — avoids contaminating supabaseAdmin's GoTrueClient session
    const payload = verifySupabaseJWT(token);
    if (!payload) {
      throw new AppError('UNAUTHORIZED', 401, 'Invalid or expired authentication token');
    }

    // Fetch the CRM role from our own users table (supabaseAdmin uses service-role key here)
    const { data: crmUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('role, is_active')
      .eq('id', payload.sub)
      .single();

    if (dbError || !crmUser) {
      throw new AppError('UNAUTHORIZED', 401, 'User account not found in CRM');
    }

    if (!crmUser.is_active) {
      throw new AppError('ACCOUNT_DEACTIVATED', 403, 'This account has been deactivated');
    }

    req.user = {
      id: payload.sub,
      email: payload.email ?? '',
      role: crmUser.role as UserRole,
      is_active: crmUser.is_active as boolean,
    };

    next();
  } catch (err) {
    next(err);
  }
};
