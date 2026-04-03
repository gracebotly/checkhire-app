// ─── CheckHire Escrow Platform — Database Types ───
// These types match the Supabase schema defined in
// supabase/migrations/20260402000000_escrow_pivot_clean_slate.sql

// ─── User Profiles ───

export type TrustBadge = 'new' | 'trusted' | 'established' | 'verified';

export type UserProfile = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  email: string | null;
  completed_deals_count: number;
  average_rating: number | null;
  trust_badge: TrustBadge;
  profile_slug: string | null;
  stripe_connected_account_id: string | null;
  stripe_onboarding_complete: boolean;
  is_platform_admin: boolean;
  suspended: boolean;
  referral_code: string | null;
  referral_slug: string | null;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Deals ───

export type DealType = 'private' | 'public';

export type DealCategory =
  | 'web_dev'
  | 'design'
  | 'writing'
  | 'video'
  | 'marketing'
  | 'virtual_assistant'
  | 'audio'
  | 'translation'
  | 'other';

export type PaymentFrequency = 'one_time' | 'weekly' | 'biweekly' | 'monthly';
export type ScreeningQuestionType = 'yes_no' | 'short_text' | 'multiple_choice';

export type ScreeningQuestion = {
  id: string;
  type: ScreeningQuestionType;
  text: string;
  options?: string[];
  dealbreaker_answer?: string;
};

export type DealStatus =
  | 'draft'
  | 'pending_acceptance'
  | 'funded'
  | 'in_progress'
  | 'submitted'
  | 'revision_requested'
  | 'completed'
  | 'disputed'
  | 'cancelled'
  | 'refunded';

export type EscrowStatus =
  | 'unfunded'
  | 'funded'
  | 'partially_released'
  | 'fully_released'
  | 'refunded'
  | 'frozen';

export type Deal = {
  id: string;
  title: string;
  description: string;
  deliverables: string | null;
  total_amount: number; // stored in cents
  currency: string;
  deadline: string | null;
  deal_type: DealType;
  deal_link_slug: string;
  slug_locked: boolean;
  category: DealCategory | null;
  other_category_description: string | null;
  payment_frequency: PaymentFrequency;
  flagged_for_review: boolean;
  flagged_reason: string | null;
  review_status: "pending" | "approved" | "changes_requested" | "rejected";
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  risk_score: number;
  client_user_id: string;
  freelancer_user_id: string | null;
  status: DealStatus;
  escrow_status: EscrowStatus;
  has_milestones: boolean;
  stripe_payment_intent_id: string | null;
  auto_release_at: string | null;
  revision_count: number;
  template_id: string | null;
  screening_questions: ScreeningQuestion[];
  guest_freelancer_email: string | null;
  guest_freelancer_name: string | null;
  guest_freelancer_stripe_account_id: string | null;
  guest_email_verified_at: string | null;
  expires_at: string | null;
  created_at: string;
  funded_at: string | null;
  accepted_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
};

export type DealWithParticipants = Deal & {
  client: Pick<UserProfile, 'display_name' | 'avatar_url' | 'trust_badge' | 'completed_deals_count' | 'average_rating' | 'profile_slug'>;
  freelancer: Pick<UserProfile, 'display_name' | 'avatar_url' | 'trust_badge' | 'completed_deals_count' | 'average_rating' | 'profile_slug' | 'stripe_onboarding_complete'> | null;
};

// ─── Milestones ───

export type MilestoneStatus =
  | 'pending_funding'
  | 'funded'
  | 'in_progress'
  | 'submitted'
  | 'revision_requested'
  | 'approved'
  | 'released'
  | 'disputed';

export type Milestone = {
  id: string;
  deal_id: string;
  title: string;
  description: string | null;
  amount: number; // cents
  position: number;
  status: MilestoneStatus;
  stripe_payment_intent_id: string | null;
  auto_release_at: string | null;
  revision_count: number;
  funded_at: string | null;
  submitted_at: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Milestone Change Proposals ───

export type ProposalType = 'add' | 'modify' | 'remove';
export type ProposalStatus = 'pending' | 'approved' | 'rejected';

export type MilestoneChangeProposal = {
  id: string;
  milestone_id: string | null;
  deal_id: string;
  proposed_by: string;
  proposal_type: ProposalType;
  proposed_title: string | null;
  proposed_amount: number | null;
  proposed_description: string | null;
  status: ProposalStatus;
  responded_at: string | null;
  created_at: string;
};

// ─── Deal Activity Log ───

export type ActivityEntryType = 'text' | 'file' | 'system' | 'milestone_note' | 'message';

export type DealActivityLogEntry = {
  id: string;
  deal_id: string;
  user_id: string | null;
  entry_type: ActivityEntryType;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  milestone_id: string | null;
  interest_id: string | null;
  is_submission_evidence: boolean;
  criteria_id: string | null;
  created_at: string;
};

export type ActivityLogEntryWithUser = DealActivityLogEntry & {
  user: Pick<UserProfile, 'display_name' | 'avatar_url'> | null;
};

// ─── Acceptance Criteria ───

export type AcceptanceCriteriaType = 'file' | 'screenshot' | 'link' | 'video' | 'text';

export type AcceptanceCriteria = {
  id: string;
  deal_id: string;
  evidence_type: AcceptanceCriteriaType;
  description: string;
  position: number;
  fulfilled: boolean;
  fulfilled_at: string | null;
  created_at: string;
};

// ─── Deal Interest (Public Deals) ───

export type InterestStatus = 'pending' | 'in_conversation' | 'accepted' | 'rejected' | 'withdrawn';

export type DealInterest = {
  id: string;
  deal_id: string;
  user_id: string;
  pitch_text: string;
  portfolio_urls: string[];
  screening_answers: { question_id: string; answer: string }[];
  status: InterestStatus;
  created_at: string;
  responded_at: string | null;
  application_files?: ApplicationFile[];
};

export type DealInterestWithUser = DealInterest & {
  user: Pick<UserProfile, 'display_name' | 'avatar_url' | 'trust_badge' | 'completed_deals_count' | 'average_rating' | 'profile_slug'>;
};

export type ApplicationFile = {
  id: string;
  interest_id: string;
  deal_id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  file_size_bytes: number;
  file_type: string;
  created_at: string;
};

// ─── Deal Templates ───

export type MilestoneTemplate = {
  title: string;
  description: string;
  amount_percentage: number; // percentage of total, 0-100
};

export type DealTemplate = {
  id: string;
  user_id: string;
  template_name: string;
  title: string;
  description: string | null;
  deliverables: string | null;
  default_amount: number | null; // cents
  default_deadline_days: number | null;
  has_milestones: boolean;
  milestone_templates: MilestoneTemplate[];
  use_count: number;
  created_at: string;
  updated_at: string;
};

// ─── Ratings ───

export type RatingRole = 'client' | 'freelancer';

export type Rating = {
  id: string;
  deal_id: string;
  rater_user_id: string;
  rated_user_id: string;
  stars: number;
  comment: string | null;
  role: RatingRole;
  created_at: string;
};

export type RatingWithUser = Rating & {
  rater: Pick<UserProfile, 'display_name' | 'avatar_url' | 'profile_slug'>;
};

// ─── Disputes ───

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_release'
  | 'resolved_refund'
  | 'resolved_partial';

export type DisputeCategory =
  | 'not_delivered'
  | 'wrong_deliverables'
  | 'incomplete_work'
  | 'quality_mismatch'
  | 'communication_issues'
  | 'other';

export type DisputeFeeTarget = 'client' | 'freelancer';

export type Dispute = {
  id: string;
  deal_id: string;
  milestone_id: string | null;
  initiated_by: string;
  reason: string;
  status: DisputeStatus;
  resolution_notes: string | null;
  resolution_amount: number | null;
  dispute_fee_amount: number | null;
  dispute_fee_charged_to: DisputeFeeTarget | null;
  category: DisputeCategory | null;
  claimant_proposed_percentage: number | null;
  claimant_justification: string | null;
  respondent_proposed_percentage: number | null;
  respondent_justification: string | null;
  negotiation_round: number;
  claimant_round2_percentage: number | null;
  respondent_round2_percentage: number | null;
  evidence_deadline_at: string | null;
  response_deadline_at: string | null;
  auto_resolved: boolean;
  extension_count: number;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

// ─── Dispute Evidence ───

export type EvidenceType = 'screenshot' | 'file' | 'video' | 'text' | 'link';

export type DisputeEvidence = {
  id: string;
  dispute_id: string;
  submitted_by: string;
  evidence_type: EvidenceType;
  file_url: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  description: string | null;
  created_at: string;
};

// ─── Timeline ───

export type TimelineNodeVariant =
  | 'system'
  | 'genesis'
  | 'payment'
  | 'evidence'
  | 'submission'
  | 'resolution'
  | 'dispute'
  | 'message'
  | 'pending';

// ─── Email Notifications ───

export type NotificationType =
  | 'deal_created'
  | 'deal_accepted'
  | 'escrow_funded'
  | 'milestone_funded'
  | 'work_submitted'
  | 'milestone_submitted'
  | 'milestone_approved'
  | 'deal_completed'
  | 'rating_reminder'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'auto_release_warning_24h'
  | 'auto_release_warning_6h'
  | 'auto_release_completed'
  | 'interest_received'
  | 'interest_accepted'
  | 'deal_filled'
  | 'revision_requested'
  | 'milestone_proposed'
  | 'milestone_change_approved'
  | 'deal_cancelled'
  | 'guest_verification_code'
  | 'deal_accepted_escrow_pending'
  | 'escrow_funded_after_accept'
  | 'funds_released'
  | 'deal_cancelled_to_freelancer'
  | 'auto_expire_warning_14d'
  | 'auto_expire_warning_27d'
  | 'auto_expire_completed'
  | 'freelancer_ghost_nudge_7d'
  | 'freelancer_ghost_warning_14d'
  | 'guest_deal_invite'
  | 'dispute_proposal_received'
  | 'dispute_auto_resolved'
  | 'dispute_negotiation_round'
  | 'dispute_escalated'
  | 'checkout_expired'
  | 'payment_failed_async'
  | 'chargeback_opened'
  | 'chargeback_closed'
  | 'payout_delayed'
  | 'payout_landed'
  | 'moderation_approved'
  | 'moderation_changes_requested'
  | 'moderation_rejected'
  | 'account_suspended'
  | 'account_unsuspended';

export type EmailNotification = {
  id: string;
  user_id: string;
  deal_id: string | null;
  notification_type: NotificationType;
  email_address: string;
  sent_at: string | null;
  created_at: string;
};

export type NotificationData = {
  dealTitle: string;
  dealSlug: string;
  amount?: number;            // cents — display by dividing by 100
  otherPartyName?: string;
  notes?: string;
  milestoneTitle?: string;
  role?: "client" | "freelancer";
  revisionNumber?: number;
  initials?: string;
  guestName?: string;
  refundAmount?: number;      // cents
  proposedPercentage?: number;
  hoursRemaining?: number;
  verificationCode?: string;
  code?: string;              // legacy alias for verificationCode
  escrowFunded?: boolean;
  isNonResponse?: boolean;
  isGuestFreelancer?: boolean;
  category?: string;
  percentage?: number;
  failureReason?: string;
  chargebackStatus?: string;
  chargebackAmount?: number;
  payoutId?: string;
  rejectionCategory?: string;
  reviewStatus?: string;
  suspensionReason?: string;
  displayName?: string;
};

// ─── Dispute with Deal Info (Admin Views) ───

export type DisputeWithDealInfo = Dispute & {
  deal: Pick<Deal, 'id' | 'title' | 'total_amount' | 'deal_link_slug' | 'status' | 'escrow_status' | 'client_user_id' | 'freelancer_user_id' | 'has_milestones'>;
  client: Pick<UserProfile, 'display_name' | 'email' | 'trust_badge' | 'completed_deals_count'>;
  freelancer: Pick<UserProfile, 'display_name' | 'email' | 'trust_badge' | 'completed_deals_count'> | null;
  initiator: Pick<UserProfile, 'display_name'>;
};

// ─── Platform Stats ───

export type PlatformStats = {
  total_deals: number;
  active_deals: number;
  completed_deals: number;
  total_volume_cents: number;
  average_deal_size_cents: number;
  dispute_rate: number;
  average_rating: number | null;
  active_users_30d: number;
  open_disputes: number;
  total_users: number;
};


// ============================================
// Referral System Types
// ============================================

export interface ReferralEarning {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  deal_id: string;
  deal_amount: number;
  platform_fee: number;
  stripe_fee: number;
  net_platform_revenue: number;
  referral_commission: number;
  status: 'credited' | 'paid_out';
  created_at: string;
  paid_out_at: string | null;
}

export interface ReferralPayout {
  id: string;
  user_id: string;
  amount: number;
  method: 'platform_credit' | 'stripe_transfer' | 'manual';
  status: 'pending' | 'completed' | 'failed';
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ReferralClick {
  id: string;
  referral_code: string;
  referrer_user_id: string;
  ip_hash: string | null;
  user_agent: string | null;
  source: string;
  converted: boolean;
  converted_user_id: string | null;
  created_at: string;
}

export interface ReferralStats {
  total_referrals: number;
  active_referrals: number;
  total_earnings: number;
  available_balance: number;
  paid_out: number;
}

export interface AdminReferralOverview {
  total_referrers: number;
  total_referred_users: number;
  total_commissions_earned: number;
  total_commissions_paid: number;
  pending_payouts: number;
  total_clicks: number;
  conversion_rate: number;
}


// ─── Deal Moderation Log ───
export type DealModerationLog = {
  id: string;
  deal_id: string;
  admin_user_id: string;
  action: "approved" | "changes_requested" | "rejected" | "escalated";
  previous_status: string | null;
  new_status: string;
  notes: string | null;
  created_at: string;
};

export type ModerationAction = "approved" | "changes_requested" | "rejected";

export type RejectionCategory =
  | "violates_terms"
  | "suspected_scam"
  | "prohibited_content"
  | "duplicate_deal"
  | "insufficient_detail"
  | "other";
