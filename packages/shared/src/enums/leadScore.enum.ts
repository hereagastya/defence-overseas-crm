/** Mirrors PostgreSQL enum: lead_score (UI spec §2.4) */
export enum LeadScore {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold',
}

export const LEAD_SCORE_LABELS: Record<LeadScore, string> = {
  [LeadScore.HOT]: 'Hot',
  [LeadScore.WARM]: 'Warm',
  [LeadScore.COLD]: 'Cold',
};
