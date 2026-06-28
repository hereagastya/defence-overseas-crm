/** Mirrors PostgreSQL enum: task_status (PRD §9) */
export enum TaskStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.OPEN]: 'Open',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.COMPLETED]: 'Completed',
  [TaskStatus.CANCELLED]: 'Cancelled',
};
