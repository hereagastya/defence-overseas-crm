/** All API endpoint paths, versioned under /api/v1 */

const V1 = '' as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${V1}/auth/login`,
    LOGOUT: `${V1}/auth/logout`,
    SESSION: `${V1}/auth/session`,
    CHANGE_PASSWORD: `${V1}/auth/change-password`,
  },

  EMPLOYEES: {
    LIST: `${V1}/employees`,
    CREATE: `${V1}/employees`,
    GET: `${V1}/employees/:id`,
    UPDATE: `${V1}/employees/:id`,
    DEACTIVATE: `${V1}/employees/:id`,
    RESET_PASSWORD: `${V1}/employees/:id/reset-password`,
  },

  LEADS: {
    LIST: `${V1}/leads`,
    CREATE: `${V1}/leads`,
    GET: `${V1}/leads/:id`,
    UPDATE: `${V1}/leads/:id`,
    DELETE: `${V1}/leads/:id`,
    UPDATE_STAGE: `${V1}/leads/:id/stage`,
    ASSIGN: `${V1}/leads/:id/assign`,
    CONVERT: `${V1}/leads/:id/convert`,
    NOTES: `${V1}/leads/:id/notes`,
    TASKS: `${V1}/leads/:id/tasks`,
    FOLLOW_UPS: `${V1}/leads/:id/follow-ups`,
    COMMUNICATIONS: `${V1}/leads/:id/communications`,
    ACTIVITY: `${V1}/leads/:id/activity`,
  },

  STUDENTS: {
    LIST: `${V1}/students`,
    GET: `${V1}/students/:id`,
    UPDATE: `${V1}/students/:id`,
    UPDATE_STAGE: `${V1}/students/:id/stage`,
    ASSIGN: `${V1}/students/:id/assign`,
    NOTES: `${V1}/students/:id/notes`,
    TASKS: `${V1}/students/:id/tasks`,
    FOLLOW_UPS: `${V1}/students/:id/follow-ups`,
    COMMUNICATIONS: `${V1}/students/:id/communications`,
    ACTIVITY: `${V1}/students/:id/activity`,
    TIMELINE: `${V1}/students/:id/timeline`,
  },

  APPLICATIONS: {
    LIST: `${V1}/students/:studentId/applications`,
    CREATE: `${V1}/students/:studentId/applications`,
    GET: `${V1}/students/:studentId/applications/:id`,
    UPDATE: `${V1}/students/:studentId/applications/:id`,
    DELETE: `${V1}/students/:studentId/applications/:id`,
  },

  DOCUMENTS: {
    LIST: `${V1}/students/:studentId/documents`,
    UPLOAD: `${V1}/students/:studentId/documents`,
    DOWNLOAD: `${V1}/students/:studentId/documents/:id/download`,
    DELETE: `${V1}/students/:studentId/documents/:id`,
  },

  /** Payment endpoints per DB Update doc — two-level: fees → installments */
  FEES: {
    LIST: `${V1}/students/:studentId/fees`,
    ASSIGN: `${V1}/students/:studentId/fees`,
    UPDATE: `${V1}/students/:studentId/fees/:feeId`,
    DELETE: `${V1}/students/:studentId/fees/:feeId`,
  },

  PAYMENTS: {
    LIST: `${V1}/students/:studentId/fees/:feeId/payments`,
    RECORD: `${V1}/students/:studentId/fees/:feeId/payments`,
    UPDATE: `${V1}/students/:studentId/fees/:feeId/payments/:paymentId`,
    DELETE: `${V1}/students/:studentId/fees/:feeId/payments/:paymentId`,
    RECEIPT: `${V1}/students/:studentId/fees/:feeId/payments/:paymentId/receipt`,
    DUES: `${V1}/payments/dues`,
  },

  TASKS: {
    LIST: `${V1}/tasks`,
    CREATE: `${V1}/tasks`,
    GET: `${V1}/tasks/:id`,
    UPDATE: `${V1}/tasks/:id`,
    DELETE: `${V1}/tasks/:id`,
    COMPLETE: `${V1}/tasks/:id/complete`,
    REOPEN: `${V1}/tasks/:id/reopen`,
  },

  FOLLOW_UPS: {
    LIST: `${V1}/follow-ups`,
    CREATE: `${V1}/follow-ups`,
    GET: `${V1}/follow-ups/:id`,
    UPDATE: `${V1}/follow-ups/:id`,
    DELETE: `${V1}/follow-ups/:id`,
    COMPLETE: `${V1}/follow-ups/:id/complete`,
  },

  NOTES: {
    CREATE: `${V1}/notes`,
    UPDATE: `${V1}/notes/:id`,
    DELETE: `${V1}/notes/:id`,
  },

  COMMUNICATIONS: {
    CREATE: `${V1}/communications`,
    LIST_BY_LEAD: `${V1}/leads/:leadId/communications`,
    LIST_BY_STUDENT: `${V1}/students/:studentId/communications`,
  },

  DASHBOARD: {
    SUMMARY: `${V1}/dashboard`,
    KPIS: `${V1}/dashboard/kpis`,
    CHARTS: `${V1}/dashboard/charts`,
    UPCOMING_FOLLOWUPS: `${V1}/dashboard/upcoming-follow-ups`,
    RECENT_ACTIVITY: `${V1}/dashboard/recent-activity`,
  },

  REPORTS: {
    LEADS: `${V1}/reports/leads`,
    REVENUE: `${V1}/reports/revenue`,
    COUNSELOR_PERFORMANCE: `${V1}/reports/counselor-performance`,
    STUDENT_PROGRESS: `${V1}/reports/student-progress`,
    APPLICATIONS: `${V1}/reports/applications`,
    COUNTRY_DISTRIBUTION: `${V1}/reports/country-distribution`,
    TASKS: `${V1}/reports/tasks`,
    FOLLOW_UPS: `${V1}/reports/follow-ups`,
  },

  NOTIFICATIONS: {
    LIST: `${V1}/notifications`,
    MARK_READ: `${V1}/notifications/:id/read`,
    MARK_ALL_READ: `${V1}/notifications/mark-all-read`,
    DISMISS: `${V1}/notifications/:id`,
  },

  SETTINGS: {
    GET: `${V1}/settings`,
    UPDATE: `${V1}/settings`,
  },

  WEBHOOKS: {
    META_VERIFY: `${V1}/webhooks/meta`,
    META_RECEIVE: `${V1}/webhooks/meta`,
    WEBSITE: `${V1}/webhooks/website`,
  },

  CALENDAR: {
    EVENTS: `${V1}/calendar`,
  },
} as const;

export type ApiEndpoints = typeof API_ENDPOINTS;
