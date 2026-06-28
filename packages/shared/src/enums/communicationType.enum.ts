/** Mirrors PostgreSQL enum: communication_type (PRD §12) */
export enum CommunicationType {
  CALL = 'call',
  MEETING = 'meeting',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

export const COMMUNICATION_TYPE_LABELS: Record<CommunicationType, string> = {
  [CommunicationType.CALL]: 'Call',
  [CommunicationType.MEETING]: 'Meeting',
  [CommunicationType.EMAIL]: 'Email',
  [CommunicationType.WHATSAPP]: 'WhatsApp',
};
