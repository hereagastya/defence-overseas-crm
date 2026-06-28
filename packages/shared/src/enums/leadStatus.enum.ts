/** Mirrors PostgreSQL enum: lead_status (UI spec §2.4) */
export enum LeadStatus {
  INTERESTED = 'interested',
  NOT_INTERESTED = 'not_interested',
  DEAD = 'dead',
  NOT_ANSWERED = 'not_answered',
  CALL_BACK = 'call_back',
  NEXT_YEAR = 'next_year',
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.INTERESTED]: 'Interested',
  [LeadStatus.NOT_INTERESTED]: 'Not Interested',
  [LeadStatus.DEAD]: 'Dead',
  [LeadStatus.NOT_ANSWERED]: 'Not Answered',
  [LeadStatus.CALL_BACK]: 'Call Back',
  [LeadStatus.NEXT_YEAR]: 'Next Year',
};
