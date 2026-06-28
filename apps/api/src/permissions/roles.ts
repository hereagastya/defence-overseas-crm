import { UserRole } from '@doc/shared';

/** Every discrete action a user can attempt in the system. */
export const Actions = {
  // Leads
  LEADS_READ: 'leads:read',
  LEADS_CREATE: 'leads:create',
  LEADS_UPDATE: 'leads:update',
  LEADS_DELETE: 'leads:delete',
  LEADS_ASSIGN: 'leads:assign',
  LEADS_CONVERT: 'leads:convert',

  // Students
  STUDENTS_READ: 'students:read',
  STUDENTS_UPDATE: 'students:update',

  // Fees
  FEES_READ: 'fees:read',
  FEES_ASSIGN: 'fees:assign',
  FEES_OVERRIDE: 'fees:override',
  FEES_UPDATE: 'fees:update',
  FEES_DELETE: 'fees:delete',

  // Payments
  PAYMENTS_READ: 'payments:read',
  PAYMENTS_CREATE: 'payments:create',
  PAYMENTS_UPDATE: 'payments:update',
  PAYMENTS_DELETE: 'payments:delete',
  PAYMENTS_RECEIPT: 'payments:receipt',

  // Documents
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_UPLOAD: 'documents:upload',
  DOCUMENTS_DOWNLOAD: 'documents:download',
  DOCUMENTS_DELETE: 'documents:delete',

  // Tasks
  TASKS_READ: 'tasks:read',
  TASKS_CREATE: 'tasks:create',
  TASKS_UPDATE: 'tasks:update',
  TASKS_DELETE: 'tasks:delete',

  // Follow-ups
  FOLLOWUPS_READ: 'followups:read',
  FOLLOWUPS_CREATE: 'followups:create',
  FOLLOWUPS_UPDATE: 'followups:update',
  FOLLOWUPS_DELETE: 'followups:delete',

  // Notes
  NOTES_READ: 'notes:read',
  NOTES_CREATE: 'notes:create',
  NOTES_UPDATE: 'notes:update',
  NOTES_DELETE: 'notes:delete',

  // Communications
  COMMUNICATIONS_READ: 'communications:read',
  COMMUNICATIONS_CREATE: 'communications:create',

  // Applications
  APPLICATIONS_READ: 'applications:read',
  APPLICATIONS_CREATE: 'applications:create',
  APPLICATIONS_UPDATE: 'applications:update',
  APPLICATIONS_DELETE: 'applications:delete',

  // Employees
  EMPLOYEES_READ: 'employees:read',
  EMPLOYEES_CREATE: 'employees:create',
  EMPLOYEES_UPDATE: 'employees:update',
  EMPLOYEES_DEACTIVATE: 'employees:deactivate',
  EMPLOYEES_RESET_PASSWORD: 'employees:reset_password',

  // Reports
  REPORTS_OWN: 'reports:own',
  REPORTS_ALL: 'reports:all',

  // Activity logs
  ACTIVITY_LOGS_READ: 'activity_logs:read',

  // Settings
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',

  // Notifications
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_MANAGE: 'notifications:manage',

  // Dashboard
  DASHBOARD_READ: 'dashboard:read',
} as const;

export type Action = (typeof Actions)[keyof typeof Actions];

/** Maps each CRM role to the set of actions it is permitted to perform. */
export const RolePermissions: Record<UserRole, Action[]> = {
  // Admin: unrestricted access across the entire system
  [UserRole.ADMIN]: Object.values(Actions) as Action[],

  // Counselor: manages their own leads and students; cannot record payments or download documents
  [UserRole.COUNSELOR]: [
    Actions.LEADS_READ,
    Actions.LEADS_CREATE,
    Actions.LEADS_UPDATE,
    Actions.LEADS_ASSIGN,
    Actions.LEADS_CONVERT,
    Actions.STUDENTS_READ,
    Actions.STUDENTS_UPDATE,
    Actions.FEES_READ,
    Actions.FEES_ASSIGN,
    Actions.PAYMENTS_READ,
    Actions.DOCUMENTS_READ,
    Actions.DOCUMENTS_UPLOAD,
    Actions.APPLICATIONS_READ,
    Actions.APPLICATIONS_CREATE,
    Actions.APPLICATIONS_UPDATE,
    Actions.TASKS_READ,
    Actions.TASKS_CREATE,
    Actions.TASKS_UPDATE,
    Actions.FOLLOWUPS_READ,
    Actions.FOLLOWUPS_CREATE,
    Actions.FOLLOWUPS_UPDATE,
    Actions.NOTES_READ,
    Actions.NOTES_CREATE,
    Actions.NOTES_UPDATE,
    Actions.COMMUNICATIONS_READ,
    Actions.COMMUNICATIONS_CREATE,
    Actions.EMPLOYEES_READ,
    Actions.REPORTS_OWN,
    Actions.NOTIFICATIONS_READ,
    Actions.NOTIFICATIONS_MANAGE,
    Actions.DASHBOARD_READ,
  ],

  // Pre-Counselor: early-stage lead work only; no student mutations, no payments
  [UserRole.PRE_COUNSELOR]: [
    Actions.LEADS_READ,
    Actions.LEADS_CREATE,
    Actions.LEADS_UPDATE,
    Actions.STUDENTS_READ,
    Actions.TASKS_READ,
    Actions.TASKS_CREATE,
    Actions.FOLLOWUPS_READ,
    Actions.FOLLOWUPS_CREATE,
    Actions.NOTES_READ,
    Actions.NOTES_CREATE,
    Actions.COMMUNICATIONS_READ,
    Actions.COMMUNICATIONS_CREATE,
    Actions.NOTIFICATIONS_READ,
    Actions.NOTIFICATIONS_MANAGE,
    Actions.DASHBOARD_READ,
  ],
};
