/** Mirrors PostgreSQL enum: followup_status (PRD §10) */
export enum FollowupStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export const FOLLOWUP_STATUS_LABELS: Record<FollowupStatus, string> = {
  [FollowupStatus.SCHEDULED]: 'Scheduled',
  [FollowupStatus.COMPLETED]: 'Completed',
  [FollowupStatus.OVERDUE]: 'Overdue',
  [FollowupStatus.CANCELLED]: 'Cancelled',
};
