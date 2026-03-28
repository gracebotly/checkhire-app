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
  >;
};

export type ScreeningQuestion = {
  id: string;
  job_listing_id: string;
  question_text: string;
  question_type: "multiple_choice" | "short_answer" | "yes_no" | "numerical";
  options: string[] | null;
  required: boolean;
  sort_order: number;
  created_at: string;
};
