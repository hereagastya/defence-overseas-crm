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

// Supabase migrated to ES256 (ECDSA P-256) signing keys.
// We fetch the public key from JWKS once and cache it for the lifetime of the process.
let cachedPublicKey: crypto.KeyObject | null = null;

async function getSupabasePublicKey(): Promise<crypto.KeyObject> {
  if (cachedPublicKey) return cachedPublicKey;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  type JWK = Record<string, string | string[] | boolean | undefined>;
  const { keys } = (await res.json()) as { keys: JWK[] };
  if (!keys?.length) throw new Error('JWKS contains no keys');
  // crypto.createPublicKey accepts a JWK-shaped object; cast needed because
  // JsonWebKey is a DOM global not included in the ES2022 lib target
  cachedPublicKey = crypto.createPublicKey({
    key: keys[0] as unknown as crypto.JsonWebKey,
    format: 'jwk',
  });
  return cachedPublicKey;
}

/**
 * Verifies a Supabase ES256 JWT locally using the project's JWKS public key.
 * The key is fetched once from /auth/v1/.well-known/jwks.json and cached in memory.
 * This avoids calling supabaseAdmin.auth.getUser(token), which contaminates the
 * GoTrueClient's in-memory session and causes subsequent PostgREST queries to
 * use the user's JWT (activating RLS) instead of the service-role key.
 */
async function verifySupabaseJWT(token: string): Promise<JWTPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  try {
    const pubKey = await getSupabasePublicKey();
    const data = Buffer.from(`${headerB64}.${payloadB64}`);
    // JWT ES256 signatures are R||S (ieee-p1363 / raw), not DER-encoded
    const signature = Buffer.from(signatureB64, 'base64url');
    const valid = crypto.verify(
      'SHA256',
      data,
      { key: pubKey, dsaEncoding: 'ieee-p1363' },
      signature,
    );
    if (!valid) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as JWTPayload;

    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    if (!payload.sub) return null;

    return payload;
  } catch {
    return null;
  }
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

    const payload = await verifySupabaseJWT(token);
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
