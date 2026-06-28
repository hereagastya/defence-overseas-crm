import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export interface LogActivityParams {
  /** UUID of the user who performed the action */
  actor_id: string;
  /** Table or domain being mutated: 'lead', 'student', 'payment', 'document', etc. */
  entity_type: string;
  /** UUID of the affected row */
  entity_id: string;
  /** Verb describing the change: 'created', 'stage_changed', 'converted', 'fee_assigned', etc. */
  action: string;
  /** Snapshot of affected fields before the change (null for INSERT) */
  previous_value?: Record<string, unknown>;
  /** Snapshot of affected fields after the change (null for DELETE) */
  new_value?: Record<string, unknown>;
  /** Supplementary context that doesn't fit previous/new (e.g. { reason: 'scholarship' }) */
  metadata?: Record<string, unknown>;
}

/**
 * Writes one immutable row to activity_logs via the service-role client.
 *
 * Design rules (from PRD §14 / Architecture §12):
 *   - Called from services, never from controllers or repositories directly.
 *   - Failure is logged at error level but NEVER propagated — the main operation
 *     must not be rolled back because of an audit log write failure.
 *   - Activity logs have no update or delete code path anywhere in the application.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  const { error } = await supabaseAdmin.from('activity_logs').insert({
    actor_id: params.actor_id,
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    action: params.action,
    previous_value: params.previous_value ?? null,
    new_value: params.new_value ?? null,
    metadata: params.metadata ?? null,
  });

  if (error) {
    // Do NOT rethrow — audit log failure must not break the business operation.
    logger.error(
      { error, entityType: params.entity_type, entityId: params.entity_id, action: params.action },
      'Failed to write activity log entry',
    );
  }
}
