import type {
  TaskPriority,
  TaskStatus,
  FollowupType,
  FollowupStatus,
  CommunicationType,
  NotificationPriority,
  NotificationStatus,
} from '../enums';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  lead_id: string | null;
  student_id: string | null;
  assigned_to: string;
  created_by: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Followup {
  id: string;
  type: FollowupType;
  lead_id: string | null;
  student_id: string | null;
  assigned_to: string;
  created_by: string;
  scheduled_at: string;
  status: FollowupStatus;
  outcome: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CommunicationLog {
  id: string;
  type: CommunicationType;
  lead_id: string | null;
  student_id: string | null;
  logged_by: string;
  summary: string;
  duration_minutes: number | null;
  logged_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Note {
  id: string;
  content: string;
  lead_id: string | null;
  student_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ActivityLog {
  id: string;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  read_at: string | null;
  deleted_at: string | null;
}
