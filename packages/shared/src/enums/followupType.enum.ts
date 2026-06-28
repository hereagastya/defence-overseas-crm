/** Mirrors PostgreSQL enum: followup_type (PRD §10) */
export enum FollowupType {
  CALL = 'call',
  MEETING = 'meeting',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

export const FOLLOWUP_TYPE_LABELS: Record<FollowupType, string> = {
  [FollowupType.CALL]: 'Call',
  [FollowupType.MEETING]: 'Meeting',
  [FollowupType.EMAIL]: 'Email',
  [FollowupType.WHATSAPP]: 'WhatsApp',
};
