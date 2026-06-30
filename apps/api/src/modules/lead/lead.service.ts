import { supabaseAdmin } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/AppError';
import { logActivity } from '../../database/activityLogger';
import { assertCan } from '../../permissions/policies';
import { Actions } from '../../permissions/roles';
import * as leadRepo from './lead.repository';
import { LeadStage, UserRole } from '@doc/shared';
import type {
  LeadWithCounselor,
  CreateLeadInput,
  UpdateLeadInput,
  UpdateLeadStageInput,
  ConvertLeadInput,
  LeadFiltersInput,
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

// ── Internal helpers ──────────────────────────────────────────────────────────

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
