import crypto from 'crypto';
import { z } from 'zod';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/AppError';
import * as leadRepo from '../lead/lead.repository';
import { LeadSource, LeadStage, LeadStatus, LeadScore } from '@doc/shared';

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Verifies Authorization: Bearer <token> using constant-time comparison.
 * Returns false for missing, malformed, or wrong tokens.
 */
export function verifyWebsiteToken(authHeader: string | undefined): boolean {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const received = authHeader.slice(7);
  const expected = env.WEBSITE_WEBHOOK_SECRET;
  // timingSafeEqual requires same-length buffers; length check first avoids throws
  // but we do NOT short-circuit on length mismatch to prevent timing leaks
  try {
    const a = Buffer.from(received.padEnd(expected.length, '\0'));
    const b = Buffer.from(expected.padEnd(received.length, '\0'));
    const lengthsMatch = received.length === expected.length;
    // Always run the comparison; discard result when lengths differ
    const valuesMatch = crypto.timingSafeEqual(
      Buffer.from(received.padEnd(Math.max(received.length, expected.length))),
      Buffer.from(expected.padEnd(Math.max(received.length, expected.length))),
    );
    void a;
    void b;
    return lengthsMatch && valuesMatch;
  } catch {
    return false;
  }
}

// ── Payload schema ────────────────────────────────────────────────────────────

export const FORM_KINDS = [
  'counselling',
  'brochure',
  'eligibility',
  'demo',
  'callback',
  'roadmap',
  'contact',
] as const;

export type FormKind = (typeof FORM_KINDS)[number];

const websiteWebhookSchema = z.object({
  source: z.string().optional(),
  kind: z.enum(FORM_KINDS),
  page: z.string().optional(),
  receivedAt: z.string().optional(),
  values: z
    .object({
      name: z.string().min(1, 'name is required'),
      phone: z.string().min(1, 'phone is required'),
      email: z.string().email('invalid email').optional().or(z.literal('')),
      course: z.string().optional(),
      country: z.string().optional(),
      message: z.string().optional(),
    })
    .passthrough(),
  fields: z.record(z.unknown()).optional(),
});

export type WebsiteWebhookPayload = z.infer<typeof websiteWebhookSchema>;

// ── Phone normalization ───────────────────────────────────────────────────────
// Same logic as meta.service.ts — strips formatting, handles Indian numbers.

function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s\-.()]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (/^[6-9]\d{9}$/.test(p)) return '+91' + p;
  if (/^91[6-9]\d{9}$/.test(p)) return '+' + p;
  return p;
}

// ── Notes builder ─────────────────────────────────────────────────────────────

function buildNotes(payload: WebsiteWebhookPayload): string | undefined {
  const lines: string[] = [`Form: ${payload.kind}`];
  if (payload.page) lines.push(`Page: ${payload.page}`);
  if (payload.values.message) lines.push(`Message: ${payload.values.message}`);
  if (payload.source) lines.push(`Source: ${payload.source}`);
  const note = lines.join('\n');
  return note.length > 0 ? note : undefined;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export interface ProcessResult {
  duplicate: boolean;
  leadId?: string;
}

/**
 * Validates the raw webhook body, normalises fields, and upserts a lead.
 * Throws AppError(400) for invalid payloads.
 * Returns { duplicate: true } instead of throwing on phone collision (409).
 */
export async function processWebsiteWebhook(body: unknown): Promise<ProcessResult> {
  const parse = websiteWebhookSchema.safeParse(body);
  if (!parse.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      400,
      parse.error.issues.map((i) => i.message).join('; '),
    );
  }

  const payload = parse.data;
  const phone = normalizePhone(payload.values.phone);
  const notes = buildNotes(payload);

  const log = logger.child({ phone, kind: payload.kind });
  log.info('website-webhook: processing form submission');

  try {
    const lead = await leadRepo.create({
      full_name: payload.values.name,
      phone,
      email: payload.values.email || undefined,
      course: payload.values.course || undefined,
      country: payload.values.country || undefined,
      lead_source: LeadSource.WEBSITE,
      lead_stage: LeadStage.NEW_INQUIRY,
      lead_status: LeadStatus.NOT_ANSWERED,
      lead_score: LeadScore.COLD,
      notes,
    });

    log.info({ leadId: lead.id }, 'website-webhook: lead created successfully');
    return { duplicate: false, leadId: lead.id };
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 409) {
      log.info(
        { errorCode: (err as AppError).errorCode },
        'website-webhook: duplicate phone — already in CRM',
      );
      return { duplicate: true };
    }
    log.error({ err }, 'website-webhook: lead creation failed');
    throw err;
  }
}
