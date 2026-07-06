import { AppError } from '../../utils/AppError';
import { logActivity } from '../../database/activityLogger';
import { assertCan } from '../../permissions/policies';
import { Actions } from '../../permissions/roles';
import { UserRole, TaskStatus } from '@doc/shared';
import type { CreateTaskInput, UpdateTaskInput, TaskFiltersInput, Pagination } from '@doc/shared';
import type { AuthenticatedUser } from '../../types/api.types';
import * as taskRepo from './task.repository';
import type { TaskWithUsers } from './task.repository';
import { buildPagination } from '../../utils/apiResponse';
import { supabaseAdmin } from '../../config/supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === UserRole.ADMIN;
}

function isTaskVisible(task: TaskWithUsers, user: AuthenticatedUser): boolean {
  if (isAdmin(user)) return true;
  return task.assigned_to === user.id || task.created_by === user.id;
}

async function assertTaskVisible(id: string, user: AuthenticatedUser): Promise<TaskWithUsers> {
  const task = await taskRepo.findById(id);
  if (!task || !isTaskVisible(task, user)) {
    throw new AppError('TASK_NOT_FOUND', 404, 'Task not found');
  }
  return task;
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
    throw new AppError('ASSIGNEE_INACTIVE', 400, 'Cannot assign a task to an inactive user');
  }
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function listTasks(
  filters: TaskFiltersInput,
  user: AuthenticatedUser,
): Promise<{ tasks: TaskWithUsers[]; pagination: Pagination }> {
  assertCan(user, Actions.TASKS_READ);

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;

  const { tasks, total } = await taskRepo.findAll(filters, user.id, isAdmin(user));
  return { tasks, pagination: buildPagination(total, page, limit) };
}

export async function getTask(id: string, user: AuthenticatedUser): Promise<TaskWithUsers> {
  assertCan(user, Actions.TASKS_READ);
  return assertTaskVisible(id, user);
}

export async function createTask(
  input: CreateTaskInput,
  user: AuthenticatedUser,
): Promise<TaskWithUsers> {
  assertCan(user, Actions.TASKS_CREATE);

  await assertAssigneeValid(input.assigned_to);

  const task = await taskRepo.create({
    title: input.title,
    description: input.description ?? null,
    lead_id: input.lead_id ?? null,
    student_id: input.student_id ?? null,
    assigned_to: input.assigned_to,
    created_by: user.id,
    priority: input.priority,
    due_date: input.due_date,
  });

  logActivity({
    actor_id: user.id,
    entity_type: 'task',
    entity_id: task.id,
    action: 'task_created',
    new_value: {
      title: task.title,
      priority: task.priority,
      assigned_to: task.assigned_to,
      due_date: task.due_date,
      lead_id: task.lead_id,
      student_id: task.student_id,
    },
  });

  return task;
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
  user: AuthenticatedUser,
): Promise<TaskWithUsers> {
  assertCan(user, Actions.TASKS_UPDATE);

  const existing = await assertTaskVisible(id, user);

  if (input.assigned_to !== undefined) {
    await assertAssigneeValid(input.assigned_to);
  }

  const dbFields: Record<string, unknown> = {};
  if (input.title !== undefined) dbFields.title = input.title;
  if (input.description !== undefined) dbFields.description = input.description ?? null;
  if (input.assigned_to !== undefined) dbFields.assigned_to = input.assigned_to;
  if (input.priority !== undefined) dbFields.priority = input.priority;
  if (input.due_date !== undefined) dbFields.due_date = input.due_date;
  if (input.status !== undefined) {
    dbFields.status = input.status;
    if (input.status === TaskStatus.COMPLETED && !existing.completed_at) {
      dbFields.completed_at = new Date().toISOString();
    }
  }

  if (Object.keys(dbFields).length === 0) return existing;

  const updated = await taskRepo.update(id, dbFields);

  logActivity({
    actor_id: user.id,
    entity_type: 'task',
    entity_id: id,
    action: 'task_updated',
    previous_value: { status: existing.status, priority: existing.priority },
    new_value: { status: updated.status, priority: updated.priority },
  });

  return updated;
}

export async function deleteTask(id: string, user: AuthenticatedUser): Promise<void> {
  assertCan(user, Actions.TASKS_DELETE);

  const task = await taskRepo.findById(id);
  if (!task) throw new AppError('TASK_NOT_FOUND', 404, 'Task not found');

  await taskRepo.softDelete(id);

  logActivity({
    actor_id: user.id,
    entity_type: 'task',
    entity_id: id,
    action: 'task_deleted',
    previous_value: { title: task.title, status: task.status },
  });
}

export async function reopenTask(id: string, user: AuthenticatedUser): Promise<TaskWithUsers> {
  assertCan(user, Actions.TASKS_UPDATE);

  const existing = await assertTaskVisible(id, user);

  if (existing.status === TaskStatus.CANCELLED) {
    throw new AppError('TASK_CANCELLED', 409, 'Cannot reopen a cancelled task');
  }

  if (existing.status !== TaskStatus.COMPLETED) {
    return existing;
  }

  const updated = await taskRepo.update(id, {
    status: TaskStatus.OPEN,
    completed_at: null,
  });

  logActivity({
    actor_id: user.id,
    entity_type: 'task',
    entity_id: id,
    action: 'task_reopened',
    previous_value: { status: existing.status },
    new_value: { status: TaskStatus.OPEN },
  });

  return updated;
}

export async function completeTask(id: string, user: AuthenticatedUser): Promise<TaskWithUsers> {
  assertCan(user, Actions.TASKS_UPDATE);

  const existing = await assertTaskVisible(id, user);

  if (existing.status === TaskStatus.COMPLETED) {
    return existing;
  }

  if (existing.status === TaskStatus.CANCELLED) {
    throw new AppError('TASK_CANCELLED', 409, 'Cannot complete a cancelled task');
  }

  const updated = await taskRepo.update(id, {
    status: TaskStatus.COMPLETED,
    completed_at: new Date().toISOString(),
  });

  logActivity({
    actor_id: user.id,
    entity_type: 'task',
    entity_id: id,
    action: 'task_completed',
    previous_value: { status: existing.status },
    new_value: { status: TaskStatus.COMPLETED },
  });

  return updated;
}
