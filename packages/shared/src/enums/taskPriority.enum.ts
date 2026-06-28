/** Mirrors PostgreSQL enum: task_priority (PRD §9) */
export enum TaskPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.HIGH]: 'High',
  [TaskPriority.MEDIUM]: 'Medium',
  [TaskPriority.LOW]: 'Low',
};
