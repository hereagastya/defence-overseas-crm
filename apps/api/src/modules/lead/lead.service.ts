import { supabaseAdmin } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/AppError';
import { logActivity } from '../../database/activityLogger';
import { assertCan } from '../../permissions/policies';
import { Actions } from '../../permissions/roles';
import * as leadRepo from './lead.repository';
import { LeadStage, LeadSource, LeadScore, UserRole, createLeadSchema } from '@doc/shared';
import type {
  LeadWithCounselor,
  CreateLeadInput,
  UpdateLeadInput,
  UpdateLeadStageInput,
  ConvertLeadInput,
  LeadFiltersInput,
  ImportLeadsSummary,
  CheckImportPhonesResult,
} from '@doc/shared';
import type { AuthenticatedUser } from '../../types/api.types';
import type { ActivityEntry, NoteEntry } from './lead.repository';
import { buildPagination } from '../../utils/apiResponse';
import type { Pagination } from '@doc/shared';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === UserRole.ADMIN;
}

/** Returns true when a non-admin user can see the given lead. */
function isLeadVisible(lead: LeadWithCounselor, user: AuthenticatedUser): boolean {
  if (isAdmin(user)) return true;
  return lead.assigned_counselor_id === user.id || lead.assigned_counselor_id === null;
}

/** Returns true when a non-admin user can mutate (update/stage/convert) the given lead. */
function isLeadEditable(lead: LeadWithCounselor, user: AuthenticatedUser): boolean {
  if (isAdmin(user)) return true;
  return lead.assigned_counselor_id === user.id;
}

/** Fetches a lead and throws 404 if it doesn't exist or isn't visible to the user. */
async function fetchVisibleLead(id: string, user: AuthenticatedUser): Promise<LeadWithCounselor> {
  const lead = await leadRepo.findById(id);
  if (!lead || !isLeadVisible(lead, user)) {
    throw new AppError('LEAD_NOT_FOUND', 404, 'Lead not found');
  }
  return lead;
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function listLeads(
  filters: LeadFiltersInput,
  user: AuthenticatedUser,
): Promise<{ leads: LeadWithCounselor[]; pagination: Pagination }> {
  assertCan(user, Actions.LEADS_READ);

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;

  const { leads, total } = await leadRepo.findAll(filters, user.id, isAdmin(user));
  return { leads, pagination: buildPagination(total, page, limit) };
}

export async function getLead(id: string, user: AuthenticatedUser): Promise<LeadWithCounselor> {
  assertCan(user, Actions.LEADS_READ);
  return fetchVisibleLead(id, user);
}

export async function createLead(
  input: CreateLeadInput,
  user: AuthenticatedUser,
): Promise<LeadWithCounselor> {
  assertCan(user, Actions.LEADS_CREATE);

  // Validate assigned counselor if provided
  if (input.assigned_counselor_id) {
    await assertCounselorExists(input.assigned_counselor_id);
  }

  const lead = await leadRepo.create(input);

  logActivity({
    actor_id: user.id,
    entity_type: 'lead',
    entity_id: lead.id,
    action: 'created',
    new_value: {
      full_name: lead.full_name,
      phone: lead.phone,
      lead_source: lead.lead_source,
      lead_stage: lead.lead_stage,
    },
  });

  return lead;
}

export async function updateLead(
  id: string,
  input: UpdateLeadInput,
  user: AuthenticatedUser,
): Promise<LeadWithCounselor> {
  assertCan(user, Actions.LEADS_UPDATE);

  const existing = await fetchVisibleLead(id, user);

  if (!isLeadEditable(existing, user)) {
    throw new AppError('FORBIDDEN', 403, 'You can only edit leads assigned to you');
  }

  // Block setting stage to converted_to_student via update — must use /convert
  if (input.lead_stage === LeadStage.CONVERTED_TO_STUDENT) {
    throw new AppError(
      'INVALID_STAGE_TRANSITION',
      400,
      'Use POST /leads/:id/convert to convert a lead to a student',
    );
  }

  // Validate counselor if being reassigned
  if (input.assigned_counselor_id !== undefined && input.assigned_counselor_id !== null) {
    await assertCounselorExists(input.assigned_counselor_id);
  }

  const dbFields: Record<string, unknown> = {};
  if (input.full_name !== undefined) dbFields.full_name = input.full_name;
  if (input.email !== undefined) dbFields.email = input.email || null;
  if (input.phone !== undefined) dbFields.phone = input.phone;
  if (input.country !== undefined) dbFields.country = input.country || null;
  if (input.nationality !== undefined) dbFields.nationality = input.nationality || null;
  if (input.course !== undefined) dbFields.course = input.course || null;
  if (input.passport_number !== undefined) dbFields.passport_number = input.passport_number || null;
  if (input.lead_stage !== undefined) dbFields.lead_stage = input.lead_stage;
  if (input.lead_status !== undefined) dbFields.lead_status = input.lead_status;
  if (input.lead_score !== undefined) dbFields.lead_score = input.lead_score;
  if (input.assigned_counselor_id !== undefined) {
    dbFields.assigned_counselor_id = input.assigned_counselor_id ?? null;
  }
  if (input.notes !== undefined) dbFields.notes = input.notes || null;

  if (Object.keys(dbFields).length === 0) {
    return existing;
  }

  const updated = await leadRepo.update(id, dbFields);

  logActivity({
    actor_id: user.id,
    entity_type: 'lead',
    entity_id: id,
    action: 'updated',
    previous_value: buildSnapshot(existing),
    new_value: buildSnapshot(updated),
  });

  return updated;
}

export async function deleteLead(id: string, user: AuthenticatedUser): Promise<void> {
  assertCan(user, Actions.LEADS_DELETE);

  const lead = await leadRepo.findById(id);
  if (!lead) throw new AppError('LEAD_NOT_FOUND', 404, 'Lead not found');

  if (lead.converted_at) {
    throw new AppError(
      'LEAD_ALREADY_CONVERTED',
      409,
      'Cannot delete a lead that has been converted to a student',
    );
  }

  await leadRepo.softDelete(id);

  logActivity({
    actor_id: user.id,
    entity_type: 'lead',
    entity_id: id,
    action: 'deleted',
    previous_value: { full_name: lead.full_name, phone: lead.phone },
  });
}

export async function updateLeadStage(
  id: string,
  input: UpdateLeadStageInput,
  user: AuthenticatedUser,
): Promise<LeadWithCounselor> {
  assertCan(user, Actions.LEADS_UPDATE);

  const existing = await fetchVisibleLead(id, user);

  if (!isLeadEditable(existing, user)) {
    throw new AppError('FORBIDDEN', 403, 'You can only update stages for leads assigned to you');
  }

  if (existing.converted_at) {
    throw new AppError(
      'LEAD_ALREADY_CONVERTED',
      409,
      'Cannot update the stage of a converted lead',
    );
  }

  if (input.lead_stage === LeadStage.CONVERTED_TO_STUDENT) {
    throw new AppError(
      'INVALID_STAGE_TRANSITION',
      400,
      'Use POST /leads/:id/convert to convert a lead to a student',
    );
  }

  const updated = await leadRepo.update(id, { lead_stage: input.lead_stage });

  logActivity({
    actor_id: user.id,
    entity_type: 'lead',
    entity_id: id,
    action: 'stage_changed',
    previous_value: { lead_stage: existing.lead_stage },
    new_value: { lead_stage: updated.lead_stage },
    metadata: input.notes ? { notes: input.notes } : undefined,
  });

  return updated;
}

export async function assignLead(
  id: string,
  counselorId: string,
  user: AuthenticatedUser,
): Promise<LeadWithCounselor> {
  assertCan(user, Actions.LEADS_ASSIGN);

  const existing = await fetchVisibleLead(id, user);

  // Non-admin counselors may only assign leads they own or that are unassigned
  if (
    !isAdmin(user) &&
    existing.assigned_counselor_id !== null &&
    existing.assigned_counselor_id !== user.id
  ) {
    throw new AppError(
      'FORBIDDEN',
      403,
      'You can only assign leads that are unassigned or assigned to you',
    );
  }

  await assertCounselorExists(counselorId);

  const updated = await leadRepo.update(id, { assigned_counselor_id: counselorId });

  logActivity({
    actor_id: user.id,
    entity_type: 'lead',
    entity_id: id,
    action: 'assigned',
    previous_value: { assigned_counselor_id: existing.assigned_counselor_id },
    new_value: { assigned_counselor_id: counselorId },
  });

  return updated;
}

export async function convertLead(
  id: string,
  input: ConvertLeadInput,
  user: AuthenticatedUser,
): Promise<{ lead: LeadWithCounselor; student_id: string }> {
  assertCan(user, Actions.LEADS_CONVERT);

  const existing = await fetchVisibleLead(id, user);

  if (!isLeadEditable(existing, user)) {
    throw new AppError('FORBIDDEN', 403, 'You can only convert leads assigned to you');
  }

  if (existing.converted_at || existing.lead_stage === LeadStage.CONVERTED_TO_STUDENT) {
    throw new AppError(
      'LEAD_ALREADY_CONVERTED',
      409,
      'This lead has already been converted to a student',
    );
  }

  // Create the student record — must happen first so the FK on leads can reference it
  const { data: studentData, error: studentError } = await supabaseAdmin
    .from('students')
    .insert({
      lead_id: existing.id,
      full_name: existing.full_name,
      phone: existing.phone,
      email: existing.email,
      date_of_birth: input.date_of_birth ?? null,
      country: input.country ?? existing.country,
      nationality: existing.nationality,
      course: input.course ?? existing.course,
      passport_number: existing.passport_number,
      lead_score: existing.lead_score,
      assigned_counselor_id: existing.assigned_counselor_id,
    })
    .select('id')
    .single();

  if (studentError || !studentData) {
    logger.error(
      { error: studentError, leadId: id },
      'Failed to create student during lead conversion',
    );
    if (studentError?.code === '23505') {
      throw new AppError(
        'LEAD_ALREADY_CONVERTED',
        409,
        'A student record already exists for this lead',
      );
    }
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to create student record');
  }

  const { id: studentId } = studentData as { id: string };

  // Update the lead — marks it as converted and links to the new student
  await leadRepo.markConverted(id, studentId);

  // Fetch the final state of the lead
  const updatedLead = await leadRepo.findById(id);
  if (!updatedLead) {
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to retrieve lead after conversion');
  }

  logActivity({
    actor_id: user.id,
    entity_type: 'lead',
    entity_id: id,
    action: 'converted',
    new_value: { student_id: studentId, converted_at: updatedLead.converted_at },
  });

  logActivity({
    actor_id: user.id,
    entity_type: 'student',
    entity_id: studentId,
    action: 'created',
    new_value: {
      full_name: existing.full_name,
      lead_id: existing.id,
      assigned_counselor_id: existing.assigned_counselor_id,
    },
  });

  return { lead: updatedLead, student_id: studentId };
}

export async function getLeadNotes(id: string, user: AuthenticatedUser): Promise<NoteEntry[]> {
  assertCan(user, Actions.NOTES_READ);
  // Verify the lead exists and is visible — reuses visibility check
  await fetchVisibleLead(id, user);
  return leadRepo.findNotes(id);
}

export async function addLeadNote(
  id: string,
  content: string,
  user: AuthenticatedUser,
): Promise<NoteEntry> {
  assertCan(user, Actions.NOTES_CREATE);
  await fetchVisibleLead(id, user);

  const note = await leadRepo.createNote(id, content, user.id);

  logActivity({
    actor_id: user.id,
    entity_type: 'lead',
    entity_id: id,
    action: 'note_added',
    new_value: { note_id: note.id },
  });

  return note;
}

export async function getLeadActivity(
  id: string,
  user: AuthenticatedUser,
): Promise<ActivityEntry[]> {
  assertCan(user, Actions.ACTIVITY_LOGS_READ);
  const lead = await leadRepo.findById(id);
  if (!lead) throw new AppError('LEAD_NOT_FOUND', 404, 'Lead not found');
  return leadRepo.findActivity(id);
}

export async function importLeads(
  rows: Record<string, unknown>[],
  user: AuthenticatedUser,
): Promise<ImportLeadsSummary> {
  assertCan(user, Actions.LEADS_IMPORT);

  const total = rows.length;
  const errors: ImportLeadsSummary['errors'] = [];
  let duplicates = 0;

  // 1. Normalize and pre-validate phones, collect candidate rows
  type CandidateRow = {
    originalIndex: number;
    input: CreateLeadInput;
  };

  const candidates: CandidateRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = i + 1;

    const rawPhone = String(raw.phone ?? raw.Phone ?? raw.mobile ?? raw.Mobile ?? '').trim();
    if (!rawPhone) {
      errors.push({ row: rowNum, reason: 'Phone number is required' });
      continue;
    }

    const phone = normalizePhone(rawPhone);

    const fullName = String(
      raw.full_name ?? raw['Full Name'] ?? raw['full name'] ?? raw.name ?? raw.Name ?? '',
    ).trim();

    if (!fullName) {
      errors.push({ row: rowNum, reason: 'Full name is required' });
      continue;
    }

    const rawSource = String(
      raw.lead_source ?? raw['Lead Source'] ?? raw.source ?? raw.Source ?? '',
    )
      .toLowerCase()
      .trim();
    const lead_source = Object.values(LeadSource).includes(rawSource as LeadSource)
      ? (rawSource as LeadSource)
      : LeadSource.MANUAL;

    const rawScore = String(raw.lead_score ?? raw.score ?? raw.Score ?? '')
      .toLowerCase()
      .trim();
    const lead_score = Object.values(LeadScore).includes(rawScore as LeadScore)
      ? (rawScore as LeadScore)
      : LeadScore.COLD;

    const email =
      String(raw.email ?? raw.Email ?? raw['Email ID'] ?? raw['email id'] ?? '').trim() ||
      undefined;
    const country = String(raw.country ?? raw.Country ?? '').trim() || undefined;
    const nationality = String(raw.nationality ?? raw.Nationality ?? '').trim() || undefined;
    const course =
      String(raw.course ?? raw.Course ?? raw.program ?? raw.Program ?? '').trim() || undefined;
    const passport_number =
      String(raw.passport_number ?? raw.passport ?? raw.Passport ?? '').trim() || undefined;
    const notes =
      String(
        raw.notes ?? raw.Notes ?? raw.remarks ?? raw.Remarks ?? raw.comment ?? raw.Comment ?? '',
      ).trim() || undefined;

    const parsed = createLeadSchema.safeParse({
      full_name: fullName,
      phone,
      email: email || '',
      country,
      nationality,
      course,
      passport_number,
      lead_source,
      lead_score,
      lead_stage: LeadStage.NEW_INQUIRY, // always New — never import legacy stage
      notes,
      assigned_counselor_id: user.id,
    });

    if (!parsed.success) {
      errors.push({ row: rowNum, reason: parsed.error.errors[0].message });
      continue;
    }

    candidates.push({ originalIndex: i, input: parsed.data });
  }

  if (candidates.length === 0) {
    return { total, imported: 0, skipped: total, duplicates: 0, errors };
  }

  // 2. Bulk-check existing phones to detect duplicates in one query
  const candidatePhones = candidates.map((c) => c.input.phone);
  const { data: existingRows } = await supabaseAdmin
    .from('leads')
    .select('phone')
    .in('phone', candidatePhones)
    .is('deleted_at', null);

  const existingPhones = new Set((existingRows ?? []).map((r: { phone: string }) => r.phone));

  // 3. Split candidates: known phone duplicates are skipped immediately
  type InsertCandidate = { input: CreateLeadInput; originalIndex: number };
  const toInsert: InsertCandidate[] = [];
  for (const c of candidates) {
    if (existingPhones.has(c.input.phone)) {
      duplicates++;
    } else {
      toInsert.push(c);
    }
  }

  // 4. Batch insert — Promise.allSettled so one failure doesn't abort the rest
  let imported = 0;
  if (toInsert.length > 0) {
    const results = await Promise.allSettled(toInsert.map(({ input }) => leadRepo.create(input)));

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        imported++;
      } else {
        const err = result.reason;
        // 409 CONFLICT = race-condition phone duplicate that slipped past the bulk check
        if (err instanceof AppError && err.statusCode === 409) {
          duplicates++;
        } else {
          // Genuine insert failure — report as invalid row, not a duplicate
          const rowNum = toInsert[i].originalIndex + 1;
          errors.push({ row: rowNum, reason: 'Failed to save — database error' });
        }
      }
    }

    // Activity log — one entry for the whole batch
    if (imported > 0) {
      logActivity({
        actor_id: user.id,
        entity_type: 'lead',
        entity_id: user.id,
        action: 'bulk_imported',
        new_value: { imported, total, source: 'spreadsheet_import' },
      });
    }
  }

  const skipped = total - imported;
  return { total, imported, skipped, duplicates, errors };
}

export async function checkImportPhones(
  phones: string[],
  emails: string[],
  user: AuthenticatedUser,
): Promise<CheckImportPhonesResult> {
  assertCan(user, Actions.LEADS_IMPORT);

  // Build lookup sets from the incoming (already-normalized) identifiers
  const inputPhoneSet = new Set(phones);
  const inputEmailSet = new Set(emails.map((e) => e.toLowerCase().trim()).filter(Boolean));

  // Fetch ALL existing phones + emails from the DB in pages of 1000.
  // We deliberately do NOT use .in('phone', phones) because PostgREST encodes
  // the entire array into a URL query string; with 1600+ entries the URL exceeds
  // 22 KB — well past the 8 KB gateway limit — and the request silently fails,
  // returning data=null so every phone appears "new".
  const PAGE_SIZE = 1000;
  const allCrmLeads: Array<{ phone: string; email: string | null }> = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('phone, email')
      .is('deleted_at', null)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      logger.error({ error }, 'checkImportPhones: failed to fetch existing leads');
      throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to check existing leads');
    }

    const rows = (data ?? []) as Array<{ phone: string; email: string | null }>;
    allCrmLeads.push(...rows);
    hasMore = rows.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  // Build CRM lookup sets
  const crmPhoneSet = new Set(allCrmLeads.map((r) => r.phone));
  const crmEmailSet = new Set(
    allCrmLeads.map((r) => r.email?.toLowerCase().trim()).filter((e): e is string => !!e),
  );

  // Intersect
  const existingPhones = [...inputPhoneSet].filter((p) => crmPhoneSet.has(p));
  const existingEmails = [...inputEmailSet].filter((e) => crmEmailSet.has(e));

  logger.info(
    {
      inputPhones: phones.length,
      inputEmails: emails.length,
      totalCrmLeads: allCrmLeads.length,
      matchedByPhone: existingPhones.length,
      matchedByEmail: existingEmails.length,
    },
    'checkImportPhones: complete',
  );

  return {
    existing: existingPhones,
    existingByEmail: existingEmails,
    debug: {
      totalCrmLeads: allCrmLeads.length,
      matchedByPhone: existingPhones.length,
      matchedByEmail: existingEmails.length,
    },
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  // Strip spaces, dashes, dots, parentheses
  let p = raw.replace(/[\s\-.()]/g, '');
  // Replace leading 00 with +
  if (p.startsWith('00')) p = '+' + p.slice(2);
  // Bare 10-digit Indian mobile (starts 6-9)
  if (/^[6-9]\d{9}$/.test(p)) return '+91' + p;
  // 12-digit with 91 prefix but no + (919XXXXXXXXX)
  if (/^91[6-9]\d{9}$/.test(p)) return '+' + p;
  return p;
}

async function assertCounselorExists(counselorId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, is_active')
    .eq('id', counselorId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to validate counselor');
  }
  if (!data) {
    throw new AppError('COUNSELOR_NOT_FOUND', 404, 'Counselor not found');
  }
  const row = data as { id: string; is_active: boolean };
  if (!row.is_active) {
    throw new AppError('COUNSELOR_INACTIVE', 400, 'Cannot assign a lead to an inactive user');
  }
}

function buildSnapshot(lead: LeadWithCounselor): Record<string, unknown> {
  return {
    full_name: lead.full_name,
    phone: lead.phone,
    lead_stage: lead.lead_stage,
    lead_status: lead.lead_status,
    lead_score: lead.lead_score,
    assigned_counselor_id: lead.assigned_counselor_id,
  };
}
