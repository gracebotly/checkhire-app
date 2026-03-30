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
  created_at: string;
  updated_at: string;
};

// ─── Deals ───

export type DealType = 'private' | 'public';

export type DealCategory =
  | 'design'
  | 'development'
  | 'writing'
  | 'marketing'
  | 'virtual_assistant'
  | 'other';

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
  category: DealCategory | null;
  client_user_id: string;
  freelancer_user_id: string | null;
  status: DealStatus;
  escrow_status: EscrowStatus;
  has_milestones: boolean;
  stripe_payment_intent_id: string | null;
  auto_release_at: string | null;
  revision_count: number;
  template_id: string | null;
  created_at: string;
  funded_at: string | null;
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

export type ActivityEntryType = 'text' | 'file' | 'system' | 'milestone_note';

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
  created_at: string;
};

export type ActivityLogEntryWithUser = DealActivityLogEntry & {
  user: Pick<UserProfile, 'display_name' | 'avatar_url'> | null;
};

// ─── Deal Interest (Public Deals) ───

export type InterestStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export type DealInterest = {
  id: string;
  deal_id: string;
  user_id: string;
  pitch_text: string;
  status: InterestStatus;
  created_at: string;
  responded_at: string | null;
};

export type DealInterestWithUser = DealInterest & {
  user: Pick<UserProfile, 'display_name' | 'avatar_url' | 'trust_badge' | 'completed_deals_count' | 'average_rating' | 'profile_slug'>;
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
  | 'deal_cancelled';

export type EmailNotification = {
  id: string;
  user_id: string;
  deal_id: string | null;
  notification_type: NotificationType;
  email_address: string;
  sent_at: string | null;
  created_at: string;
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
};
