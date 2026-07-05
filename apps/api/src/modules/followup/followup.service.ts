import { AppError } from '../../utils/AppError';
import { logActivity } from '../../database/activityLogger';
import { assertCan } from '../../permissions/policies';
import { Actions } from '../../permissions/roles';
import { UserRole, FollowupStatus } from '@doc/shared';
import type {
  CreateFollowupInput,
  UpdateFollowupInput,
  CompleteFollowupInput,
  FollowupFiltersInput,
  Pagination,
} from '@doc/shared';
import type { AuthenticatedUser } from '../../types/api.types';
import * as followupRepo from './followup.repository';
import type { FollowupWithUsers } from './followup.repository';
import { buildPagination } from '../../utils/apiResponse';
import { supabaseAdmin } from '../../config/supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === UserRole.ADMIN;
}

function isFollowupVisible(followup: FollowupWithUsers, user: AuthenticatedUser): boolean {
  if (isAdmin(user)) return true;
  return followup.assigned_to === user.id || followup.created_by === user.id;
}

async function assertFollowupVisible(
  id: string,
  user: AuthenticatedUser,
): Promise<FollowupWithUsers> {
  const followup = await followupRepo.findById(id);
  if (!followup || !isFollowupVisible(followup, user)) {
    throw new AppError('FOLLOWUP_NOT_FOUND', 404, 'Follow-up not found');
  }
  return followup;
}

async function assertAssigneeValid(assignedTo: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, is_active')
    .eq('id', assignedTo)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to validate assignee');
  if (!data) throw new AppError('ASSIGNEE_NOT_FOUND', 404, 'Assigned user not found');

  const row = data as { id: string; is_active: boolean };
  if (!row.is_active) {
    throw new AppError('ASSIGNEE_INACTIVE', 400, 'Cannot assign a follow-up to an inactive user');
  }
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function listFollowups(
  filters: FollowupFiltersInput,
  user: AuthenticatedUser,
): Promise<{ followups: FollowupWithUsers[]; pagination: Pagination }> {
  assertCan(user, Actions.FOLLOWUPS_READ);

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;

  const { followups, total } = await followupRepo.findAll(filters, user.id, isAdmin(user));
  return { followups, pagination: buildPagination(total, page, limit) };
}

export async function getFollowup(id: string, user: AuthenticatedUser): Promise<FollowupWithUsers> {
  assertCan(user, Actions.FOLLOWUPS_READ);
  return assertFollowupVisible(id, user);
}

export async function createFollowup(
  input: CreateFollowupInput,
  user: AuthenticatedUser,
): Promise<FollowupWithUsers> {
  assertCan(user, Actions.FOLLOWUPS_CREATE);

  await assertAssigneeValid(input.assigned_to);

  const followup = await followupRepo.create({
    type: input.type,
    lead_id: input.lead_id ?? null,
    student_id: input.student_id ?? null,
    assigned_to: input.assigned_to,
    created_by: user.id,
    scheduled_at: input.scheduled_at,
    notes: input.notes ?? null,
  });

  logActivity({
    actor_id: user.id,
    entity_type: 'followup',
    entity_id: followup.id,
    action: 'followup_created',
    new_value: {
      type: followup.type,
      scheduled_at: followup.scheduled_at,
      assigned_to: followup.assigned_to,
      lead_id: followup.lead_id,
      student_id: followup.student_id,
    },
  });

  return followup;
}

export async function updateFollowup(
  id: string,
  input: UpdateFollowupInput,
  user: AuthenticatedUser,
): Promise<FollowupWithUsers> {
  assertCan(user, Actions.FOLLOWUPS_UPDATE);

  const existing = await assertFollowupVisible(id, user);

  if (existing.status === FollowupStatus.COMPLETED) {
    throw new AppError('FOLLOWUP_COMPLETED', 409, 'Cannot modify a completed follow-up');
  }

  if (input.assigned_to !== undefined) {
    await assertAssigneeValid(input.assigned_to);
  }

  const dbFields: Record<string, unknown> = {};
  if (input.type !== undefined) dbFields.type = input.type;
  if (input.assigned_to !== undefined) dbFields.assigned_to = input.assigned_to;
  if (input.scheduled_at !== undefined) dbFields.scheduled_at = input.scheduled_at;
  if (input.status !== undefined) {
    dbFields.status = input.status;
    if (input.status === FollowupStatus.COMPLETED && !existing.completed_at) {
      dbFields.completed_at = new Date().toISOString();
    }
  }
  if (input.outcome !== undefined) dbFields.outcome = input.outcome ?? null;
  if (input.notes !== undefined) dbFields.notes = input.notes ?? null;

  if (Object.keys(dbFields).length === 0) return existing;

  const updated = await followupRepo.update(id, dbFields);

  logActivity({
    actor_id: user.id,
    entity_type: 'followup',
    entity_id: id,
    action: 'followup_updated',
    previous_value: { status: existing.status, scheduled_at: existing.scheduled_at },
    new_value: { status: updated.status, scheduled_at: updated.scheduled_at },
  });

  return updated;
}

export async function deleteFollowup(id: string, user: AuthenticatedUser): Promise<void> {
  assertCan(user, Actions.FOLLOWUPS_DELETE);

  const followup = await followupRepo.findById(id);
  if (!followup) throw new AppError('FOLLOWUP_NOT_FOUND', 404, 'Follow-up not found');

  await followupRepo.softDelete(id);

  logActivity({
    actor_id: user.id,
    entity_type: 'followup',
    entity_id: id,
    action: 'followup_deleted',
    previous_value: { type: followup.type, status: followup.status },
  });
}

export async function completeFollowup(
  id: string,
  input: CompleteFollowupInput,
  user: AuthenticatedUser,
): Promise<FollowupWithUsers> {
  assertCan(user, Actions.FOLLOWUPS_UPDATE);

  const existing = await assertFollowupVisible(id, user);

  if (existing.status === FollowupStatus.COMPLETED) {
    return existing;
  }

  if (existing.status === FollowupStatus.CANCELLED) {
    throw new AppError('FOLLOWUP_CANCELLED', 409, 'Cannot complete a cancelled follow-up');
  }

  const updated = await followupRepo.update(id, {
    status: FollowupStatus.COMPLETED,
    outcome: input.outcome,
    completed_at: new Date().toISOString(),
  });

  logActivity({
    actor_id: user.id,
    entity_type: 'followup',
    entity_id: id,
    action: 'followup_completed',
    previous_value: { status: existing.status },
    new_value: { status: FollowupStatus.COMPLETED, outcome: input.outcome },
  });

  return updated;
}
