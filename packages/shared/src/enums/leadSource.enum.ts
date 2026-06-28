/** Mirrors PostgreSQL enum: lead_source (PRD §5 — Meta Ads, website, manual) */
export enum LeadSource {
  META_ADS = 'meta_ads',
  WEBSITE = 'website',
  MANUAL = 'manual',
  REFERRAL = 'referral',
}

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  [LeadSource.META_ADS]: 'Meta Lead Ads',
  [LeadSource.WEBSITE]: 'Website',
  [LeadSource.MANUAL]: 'Manual Entry',
  [LeadSource.REFERRAL]: 'Referral',
};
