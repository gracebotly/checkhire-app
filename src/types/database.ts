// ─── CheckHire Database Types ───
// These types match the Supabase schema defined in supabase/migrations/001_core_schema.sql

export type TierLevel = 1 | 2 | 3;

export type JobType = "gig" | "temp" | "full_time" | "part_time" | "contract";

export type PayType = "hourly" | "salary" | "project" | "commission";

export type RemoteType = "full_remote" | "hybrid" | "onsite";

export type ListingStatus =
  | "active"
  | "filled"
  | "closed"
  | "expired"
  | "paused"
  | "review_pending";

export type EscrowStatus =
  | "not_applicable"
  | "pending_funding"
  | "funded"
  | "released"
  | "refunded";

export type CommissionStructure = {
  commission_percentage?: number;
  commission_basis?: string;
  is_100_percent_commission?: boolean;
  average_earnings?: number;
  time_to_first_payment?: string;
  leads_provided?: boolean;
};

export type Employer = {
  id: string;
  company_name: string;
  website_domain: string | null;
  verified_domain: boolean;
  claimed_by: string | null;
  tier_level: TierLevel;
  transparency_score: number;
  logo_url: string | null;
  description: string | null;
  industry: string | null;
  company_size: string | null;
  country: string;
  slug: string | null;
  created_at: string;
  updated_at: string;
};

export type JobListing = {
  id: string;
  employer_id: string;
  posted_by: string | null;
  title: string;
  description: string;
  job_type: JobType;
  category: string | null;
  salary_min: number | null;
  salary_max: number | null;
  pay_type: PayType;
  commission_structure: CommissionStructure | null;
  ote_min: number | null;
  ote_max: number | null;
  is_100_percent_commission: boolean;
  remote_type: RemoteType;
  location_city: string | null;
  location_state: string | null;
  location_country: string;
  timezone_requirements: string | null;
  equipment_policy: string | null;
  respond_by_date: string | null;
  fill_by_date: string | null;
  status: ListingStatus;
  close_reason: string | null;
  escrow_status: EscrowStatus;
  requires_video_application: boolean;
  video_questions: VideoQuestion[];
  requires_screening_quiz: boolean;
  max_applications: number;
  current_application_count: number;
  mlm_flag_score: number;
  slug: string;
  created_at: string;
  expires_at: string;
  updated_at: string;
};

export type JobListingWithEmployer = JobListing & {
  employers: Pick<
    Employer,
    | "company_name"
    | "tier_level"
    | "logo_url"
    | "transparency_score"
    | "industry"
    | "company_size"
    | "website_domain"
    | "description"
    | "country"
  > & { slug: string | null };
};

export type ScreeningQuestion = {
  id: string;
  job_listing_id: string;
  question_text: string;
  question_type: "multiple_choice" | "short_answer" | "yes_no" | "numerical";
  options: string[] | null;
  required: boolean;
  sort_order: number;
  is_knockout: boolean;
  knockout_answer: string | null;
  point_value: number;
  min_length: number | null;
  question_category: string | null;
  created_at: string;
};

// ─── Slice 3: Seeker & Application Types ───

export type ApplicationStatus =
  | "applied"
  | "reviewed"
  | "shortlisted"
  | "interview_requested"
  | "interview_accepted"
  | "offered"
  | "rejected"
  | "hired"
  | "withdrawn";

export type DisclosureLevel = 1 | 2 | 3;

export type ParseStatus = "pending" | "parsed" | "failed";

export type ParsedWorkHistoryEntry = {
  title: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
};

export type ParsedEducationEntry = {
  degree: string;
  school: string;
  field: string | null;
  graduation_year: number | null;
};

export type SeekerProfile = {
  id: string;
  skills: string[];
  years_experience: number | null;
  location_city: string | null;
  location_state: string | null;
  education_level: string | null;
  education_field: string | null;
  resume_file_url: string | null;
  parsed_work_history: ParsedWorkHistoryEntry[];
  parsed_education: ParsedEducationEntry[];
  parsed_certifications: string[];
  parsed_summary: string | null;
  parse_status: ParseStatus;
  created_at: string;
  updated_at: string;
};

export type Application = {
  id: string;
  job_listing_id: string;
  user_id: string;
  pseudonym: string;
  disclosure_level: DisclosureLevel;
  status: ApplicationStatus;
  screening_responses: Record<string, unknown> | null;
  video_responses: VideoResponse[];
  screening_score: number | null;
  disclosed_at_stage2: string | null;
  disclosed_at_stage3: string | null;
  withdrawn_at: string | null;
  created_at: string;
};

export type ApplicationWithListing = Application & {
  job_listings: Pick<
    JobListing,
    | "title"
    | "slug"
    | "job_type"
    | "pay_type"
    | "salary_min"
    | "salary_max"
    | "remote_type"
    | "status"
    | "created_at"
    | "expires_at"
  > & {
    employers: Pick<Employer, "company_name" | "tier_level" | "logo_url" | "slug">;
  };
};

/**
 * What an employer sees when viewing a candidate at a given disclosure level.
 * Fields are progressively revealed based on disclosure_level.
 */
export type CandidateView = {
  application_id: string;
  pseudonym: string;
  disclosure_level: DisclosureLevel;
  status: ApplicationStatus;
  created_at: string;

  // Always visible (Stage 1+)
  skills: string[];
  years_experience: number | null;
  location_city: string | null;
  location_state: string | null;
  education_level: string | null;
  education_field: string | null;
  parsed_work_history: ParsedWorkHistoryEntry[];
  parsed_education: ParsedEducationEntry[];
  parsed_certifications: string[];
  parsed_summary: string | null;
  screening_responses: Record<string, unknown> | null;
  video_responses: VideoResponse[];
  screening_score: number | null;

  // Stage 2+ only
  first_name?: string;

  // Stage 3+ only
  full_name?: string;
  resume_url?: string; // Signed, expiring URL
};

export type AccessAuditLogEntry = {
  employer_id: string;
  employer_user_id: string;
  action_type:
    | "candidate_view"
    | "interview_request"
    | "message_sent"
    | "stage_advance"
    | "resume_access";
  application_id: string;
  disclosure_level_at_time: DisclosureLevel;
  ip_address: string | null;
  user_agent: string | null;
};

// ─── Slice 4: Chat, Interview Scheduling, Rate Limit Events ───

export type MessageSenderType = "employer" | "candidate" | "system";

export type MessageType =
  | "text"
  | "system"
  | "interview_request"
  | "interview_response"
  | "status_change"
  | "interview_scheduled"
  | "slot_selected";

export type Message = {
  id: string;
  application_id: string;
  sender_id: string;
  sender_type: MessageSenderType;
  message_text: string;
  message_type: MessageType;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type InterviewSlot = {
  datetime: string; // ISO 8601
  duration_minutes: number;
};

export type InterviewScheduleStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed";

export type InterviewSchedule = {
  id: string;
  application_id: string;
  proposed_by: string;
  proposed_slots: InterviewSlot[];
  selected_slot: InterviewSlot | null;
  video_call_link: string | null;
  notes: string | null;
  timezone_employer: string | null;
  timezone_candidate: string | null;
  status: InterviewScheduleStatus;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RateLimitEvent = {
  id: string;
  employer_id: string | null;
  endpoint: string;
  hits_in_window: number;
  window_start: string;
  window_end: string;
  flagged: boolean;
  reviewed: boolean;
  reviewed_by: string | null;
  resolution: "cleared" | "warned" | "suspended" | null;
  created_at: string;
};

/**
 * A chat thread summary for the inbox view.
 * Combines application metadata with latest message info.
 */
export type ChatThread = {
  application_id: string;
  pseudonym: string;
  disclosure_level: DisclosureLevel;
  status: ApplicationStatus;
  first_name?: string;
  full_name?: string;
  // Listing context
  listing_title: string;
  listing_slug: string;
  company_name: string;
  tier_level: TierLevel;
  logo_url: string | null;
  // Message info
  last_message_text: string | null;
  last_message_at: string | null;
  last_message_sender_type: MessageSenderType | null;
  unread_count: number;
};


// ─── Slice 5: Video, Masked Email, Screening Enhancements ───

export type VideoQuestion = {
  prompt: string;
  time_limit_seconds: number;
  max_retakes: number;
};

export type VideoResponse = {
  question_index: number;
  video_url: string;
  recorded_at: string;
};

export type MaskedEmailPairStatus = "active" | "deactivated";

export type MaskedEmailPair = {
  id: string;
  application_id: string;
  employer_id: string;
  applicant_user_id: string;
  employer_masked_email: string;
  applicant_masked_email: string;
  status: MaskedEmailPairStatus;
  activated_at: string;
  deactivated_at: string | null;
  created_at: string;
};

export type CommunicationDirection =
  | "employer_to_applicant"
  | "applicant_to_employer";

export type CommunicationLog = {
  id: string;
  masked_email_pair_id: string | null;
  communication_type: "email" | "call" | "sms";
  direction: CommunicationDirection;
  subject_snippet: string | null;
  timestamp: string;
  created_at: string;
};

export type RejectionTemplate = {
  id: string;
  employer_id: string | null;
  name: string;
  message_text: string;
  is_default: boolean;
  created_at: string;
};

export type QuestionTemplateCategory =
  | "remote_readiness"
  | "sales"
  | "technical"
  | "customer_service"
  | "general";

export type QuestionTemplateEntry = {
  question_text: string;
  question_type: "multiple_choice" | "short_answer" | "yes_no" | "numerical";
  options: string[] | null;
  is_knockout: boolean;
  knockout_answer: string | null;
  point_value: number;
  min_length?: number;
};

export type QuestionTemplate = {
  id: string;
  employer_id: string | null;
  category: QuestionTemplateCategory;
  name: string;
  questions: QuestionTemplateEntry[];
  is_platform_default: boolean;
  created_at: string;
};
