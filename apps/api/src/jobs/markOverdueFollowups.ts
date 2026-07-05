import { markOverdue } from '../modules/followup/followup.repository';
import { logger } from '../utils/logger';

/** Marks all scheduled follow-ups whose scheduled_at is in the past as overdue. */
export async function markOverdueFollowups(): Promise<void> {
  try {
    await markOverdue();
  } catch (err) {
    logger.error({ err }, 'markOverdueFollowups job failed');
  }
}
