/** Mirrors PostgreSQL enum: application_status (PRD §7, UI spec §2.4) */
export enum ApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  OFFER_RECEIVED = 'offer_received',
  OFFER_ACCEPTED = 'offer_accepted',
  OFFER_REJECTED = 'offer_rejected',
  WITHDRAWN = 'withdrawn',
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.DRAFT]: 'Draft',
  [ApplicationStatus.SUBMITTED]: 'Submitted',
  [ApplicationStatus.UNDER_REVIEW]: 'Under Review',
  [ApplicationStatus.OFFER_RECEIVED]: 'Offer Received',
  [ApplicationStatus.OFFER_ACCEPTED]: 'Offer Accepted',
  [ApplicationStatus.OFFER_REJECTED]: 'Offer Rejected',
  [ApplicationStatus.WITHDRAWN]: 'Withdrawn',
};
