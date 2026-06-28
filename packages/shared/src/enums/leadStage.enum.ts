/** Mirrors PostgreSQL enum: lead_stage — 9 pipeline stages (PRD §5) */
export enum LeadStage {
  NEW_INQUIRY = 'new_inquiry',
  PRE_COUNSELING = 'pre_counseling',
  ONE_TO_ONE_COUNSELING = 'one_to_one_counseling',
  MOCK_TEST = 'mock_test',
  WEBINAR = 'webinar',
  REGISTRATION = 'registration',
  POST_COUNSELING = 'post_counseling',
  REGISTRATION_COMPLETED = 'registration_completed',
  CONVERTED_TO_STUDENT = 'converted_to_student',
}

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  [LeadStage.NEW_INQUIRY]: 'New Inquiry',
  [LeadStage.PRE_COUNSELING]: 'Pre-Counseling',
  [LeadStage.ONE_TO_ONE_COUNSELING]: 'One-to-One Counseling',
  [LeadStage.MOCK_TEST]: 'Mock Test',
  [LeadStage.WEBINAR]: 'Webinar',
  [LeadStage.REGISTRATION]: 'Registration',
  [LeadStage.POST_COUNSELING]: 'Post-Counseling',
  [LeadStage.REGISTRATION_COMPLETED]: 'Registration Completed',
  [LeadStage.CONVERTED_TO_STUDENT]: 'Converted to Student',
};

export const LEAD_STAGE_ORDER: LeadStage[] = [
  LeadStage.NEW_INQUIRY,
  LeadStage.PRE_COUNSELING,
  LeadStage.ONE_TO_ONE_COUNSELING,
  LeadStage.MOCK_TEST,
  LeadStage.WEBINAR,
  LeadStage.REGISTRATION,
  LeadStage.POST_COUNSELING,
  LeadStage.REGISTRATION_COMPLETED,
  LeadStage.CONVERTED_TO_STUDENT,
];
