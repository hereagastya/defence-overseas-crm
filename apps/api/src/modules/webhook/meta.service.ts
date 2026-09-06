import crypto from 'crypto';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/AppError';
import * as leadRepo from '../lead/lead.repository';
import { LeadSource, LeadStage, LeadStatus, LeadScore } from '@doc/shared';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

// ── Webhook payload types ─────────────────────────────────────────────────────

interface MetaFieldData {
  name: string;
  values: string[];
}

interface MetaLeadRecord {
  id: string;
  created_time: string;
  field_data: MetaFieldData[];
}

interface MetaWebhookChangeValue {
  leadgen_id: string;
  page_id: string;
  form_id: string;
  ad_id?: string;
  created_time: number;
}

interface MetaWebhookChange {
  field: string;
  value: MetaWebhookChangeValue;
}

interface MetaWebhookEntry {
  id: string;
  time: number;
  changes: MetaWebhookChange[];
}

export interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}

// ── Field name mapping ────────────────────────────────────────────────────────
// Maps Meta Instant Form field names (lowercased, spaces → underscores) to CRM fields.
// Covers Meta's built-in field names and common custom label variations.
// To support a client's non-standard labels, add entries here using the label
// exactly as it appears in Meta's form builder, lowercased with spaces as underscores.

type CrmField = keyof MappedFields;

const META_FIELD_MAP: Record<string, CrmField> = {
  // Name
  full_name: 'full_name',
  name: 'full_name',
  // Phone
  phone_number: 'phone',
  phone: 'phone',
  mobile_phone: 'phone',
  mobile: 'phone',
  mobile_number: 'phone',
  contact_number: 'phone',
  // Email
  email: 'email',
  email_address: 'email',
  // Country
  country: 'country',
  country_code: 'country',
  // Course / programme
  course: 'course',
  program: 'course',
  programme: 'course',
  interested_course: 'course',
  course_interest: 'course',
  course_name: 'course',
  // Nationality
  nationality: 'nationality',
  // Passport
  passport_number: 'passport_number',
  passport: 'passport_number',
};

interface MappedFields {
  full_name?: string;
  phone?: string;
  email?: string;
  country?: string;
  nationality?: string;
  course?: string;
  passport_number?: string;
}

// ── Signature verification ────────────────────────────────────────────────────

/**
 * Verifies the X-Hub-Signature-256 header that Meta attaches to every webhook POST.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyMetaSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const received = signatureHeader.slice(7);
  const expected = crypto
    .createHmac('sha256', env.META_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    // Buffer lengths differ (malformed hex) — signature is invalid
    return false;
  }
}

// ── Graph API ─────────────────────────────────────────────────────────────────

/**
 * Fetches the lead field data from Meta's Graph API.
 * The webhook payload only contains the leadgen_id; the actual form answers
 * must be retrieved from the API using a Page Access Token.
 */
async function fetchLeadRecord(leadgenId: string): Promise<MetaLeadRecord> {
  // Page access token is included as a query param — never logged (see log calls below)
  const url =
    `${GRAPH_API_BASE}/${encodeURIComponent(leadgenId)}` +
    `?fields=field_data,created_time` +
    `&access_token=${encodeURIComponent(env.META_PAGE_ACCESS_TOKEN)}`;

  const response = await fetch(url);

  if (!response.ok) {
    // Truncate error body — may contain token info in some Graph API error formats
    const body = await response.text().catch(() => '');
    const safeBody = body.slice(0, 300).replace(env.META_PAGE_ACCESS_TOKEN, '[REDACTED]');
    throw new Error(`Graph API ${response.status} for leadgen_id ${leadgenId}: ${safeBody}`);
  }

  return (await response.json()) as MetaLeadRecord;
}

// ── Field mapping ─────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s\-.()]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (/^[6-9]\d{9}$/.test(p)) return '+91' + p;
  if (/^91[6-9]\d{9}$/.test(p)) return '+' + p;
  return p;
}

interface FieldMappingResult {
  mapped: MappedFields;
  unknownFields: string | null;
}

function mapFieldData(fieldData: MetaFieldData[]): FieldMappingResult {
  const mapped: MappedFields = {};
  const unknown: string[] = [];

  for (const field of fieldData) {
    const value = (field.values[0] ?? '').trim();
    if (!value) continue;

    const normalizedKey = field.name.toLowerCase().replace(/\s+/g, '_');
    const crmField = META_FIELD_MAP[normalizedKey];

    if (crmField) {
      // First match wins — handles forms that send both "phone" and "phone_number"
      mapped[crmField] ??= value;
    } else {
      unknown.push(`${field.name}: ${value}`);
    }
  }

  const unknownFields =
    unknown.length > 0 ? `Meta form extra fields:\n${unknown.join('\n')}` : null;

  return { mapped, unknownFields };
}

// ── Lead processing ───────────────────────────────────────────────────────────

async function processLeadgenId(
  leadgenId: string,
  context: { pageId: string; formId: string },
): Promise<void> {
  const log = logger.child({ leadgenId, pageId: context.pageId, formId: context.formId });
  log.info('meta-webhook: fetching lead data from Graph API');

  let record: MetaLeadRecord;
  try {
    record = await fetchLeadRecord(leadgenId);
  } catch (err) {
    log.error({ err }, 'meta-webhook: Graph API fetch failed');
    throw err;
  }

  const { mapped, unknownFields } = mapFieldData(record.field_data);

  if (!mapped.full_name) {
    log.warn(
      { fieldNames: record.field_data.map((f) => f.name) },
      'meta-webhook: full_name missing from form submission — cannot create lead',
    );
    return;
  }

  if (!mapped.phone) {
    log.warn(
      { fieldNames: record.field_data.map((f) => f.name) },
      'meta-webhook: phone missing from form submission — cannot create lead',
    );
    return;
  }

  const phone = normalizePhone(mapped.phone);

  try {
    const lead = await leadRepo.create({
      full_name: mapped.full_name,
      phone,
      email: mapped.email || undefined,
      country: mapped.country || undefined,
      nationality: mapped.nationality || undefined,
      course: mapped.course || undefined,
      passport_number: mapped.passport_number || undefined,
      lead_source: LeadSource.META_ADS,
      lead_stage: LeadStage.NEW_INQUIRY,
      lead_status: LeadStatus.NOT_ANSWERED,
      lead_score: LeadScore.WARM,
      notes: unknownFields ?? undefined,
      meta_lead_id: leadgenId,
    });

    log.info({ leadId: lead.id, phone }, 'meta-webhook: lead created successfully');
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 409) {
      // Expected: same leadgen_id received again (Meta retry) or same phone already in CRM
      log.info(
        { errorCode: err.errorCode },
        'meta-webhook: duplicate lead — already in CRM, skipping',
      );
      return;
    }
    log.error({ err, phone }, 'meta-webhook: lead creation failed');
    throw err;
  }
}

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * Processes a validated Meta webhook payload.
 * Iterates over all entries and lead-gen changes, fetches each lead from the
 * Graph API, maps fields, and upserts into the CRM. Errors on individual
 * leadgen_ids are logged and skipped so one failure doesn't block the rest.
 */
export async function processWebhookPayload(payload: MetaWebhookPayload): Promise<void> {
  if (payload.object !== 'page') {
    logger.info({ object: payload.object }, 'meta-webhook: ignoring non-page object type');
    return;
  }

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'leadgen') continue;

      const { leadgen_id: leadgenId, page_id: pageId, form_id: formId } = change.value;

      try {
        await processLeadgenId(leadgenId, { pageId, formId });
      } catch (err) {
        // Log and continue — one failed leadgen_id should not block the rest in the batch
        logger.error({ err, leadgenId }, 'meta-webhook: failed to process leadgen_id, continuing');
      }
    }
  }
}
