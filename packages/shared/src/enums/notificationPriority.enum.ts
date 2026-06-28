/** Mirrors PostgreSQL enum: notification_priority (PRD §21, UI spec §2.4) */
export enum NotificationPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export const NOTIFICATION_PRIORITY_LABELS: Record<NotificationPriority, string> = {
  [NotificationPriority.CRITICAL]: 'Critical',
  [NotificationPriority.HIGH]: 'High',
  [NotificationPriority.MEDIUM]: 'Medium',
  [NotificationPriority.LOW]: 'Low',
};
