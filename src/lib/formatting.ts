import type { PayType } from "@/types/database";

/**
 * Format a salary range for display.
 * Examples: "$90,000 – $120,000/yr", "$35 – $50/hr", "$3,000 (project)"
 */
export function formatSalary(
  min: number | null,
  max: number | null,
  payType: PayType
): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const suffix: Record<PayType, string> = {
    salary: "/yr",
    hourly: "/hr",
    project: "",
    commission: "/yr",
  };

  if (min != null && max != null && min !== max) {
    return `${fmt(min)} – ${fmt(max)}${suffix[payType]}`;
  }
  if (min != null) {
    return `${fmt(min)}${max ? ` – ${fmt(max)}` : ""}${suffix[payType]}`;
  }
  if (max != null) {
    return `Up to ${fmt(max)}${suffix[payType]}`;
  }
  return "Compensation not listed";
}

/**
 * Format full compensation display including commission and OTE.
 */
export function formatCompensation(listing: {
  salary_min: number | null;
  salary_max: number | null;
  pay_type: PayType;
  commission_structure: { is_100_percent_commission?: boolean } | null;
  ote_min: number | null;
  ote_max: number | null;
  is_100_percent_commission: boolean;
}): {
  primary: string;
  secondary: string | null;
  isCommissionOnly: boolean;
} {
  const base = formatSalary(listing.salary_min, listing.salary_max, listing.pay_type);

  if (listing.is_100_percent_commission) {
    const ote =
      listing.ote_min != null || listing.ote_max != null
        ? `OTE: ${formatSalary(listing.ote_min, listing.ote_max, "salary")}`
        : null;
    return { primary: "Commission only — no base salary", secondary: ote, isCommissionOnly: true };
  }

  if (listing.pay_type === "commission" && (listing.ote_min || listing.ote_max)) {
    const ote = formatSalary(listing.ote_min, listing.ote_max, "salary");
    return { primary: base, secondary: `OTE: ${ote}`, isCommissionOnly: false };
  }

  return { primary: base, secondary: null, isCommissionOnly: false };
}

/**
 * Calculate days remaining until expiration.
 */
export function getDaysRemaining(expiresAt: string): {
  days: number;
  label: string;
  urgency: "green" | "yellow" | "red" | "expired";
} {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) return { days: 0, label: "Expired", urgency: "expired" };
  if (days === 1) return { days: 1, label: "Expires tomorrow", urgency: "red" };
  if (days <= 6) return { days, label: `${days} days left`, urgency: "red" };
  if (days <= 14) return { days, label: `${days} days left`, urgency: "yellow" };
  return { days, label: `${days} days left`, urgency: "green" };
}

/**
 * Format application count with cap.
 * Examples: "47 / 100 applications", "98 / 100 applications"
 */
export function formatApplicationCount(
  current: number,
  max: number
): { label: string; percentage: number; urgency: "green" | "yellow" | "red" } {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const urgency = pct >= 90 ? "red" : pct >= 70 ? "yellow" : "green";
  return {
    label: `${current} / ${max} applications`,
    percentage: pct,
    urgency,
  };
}

/**
 * Format relative posted date.
 * Examples: "Posted today", "Posted 3 days ago", "Posted 2 weeks ago"
 */
export function formatPostedDate(createdAt: string): string {
  const now = new Date();
  const posted = new Date(createdAt);
  const diffMs = now.getTime() - posted.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days === 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 7) return `Posted ${days} days ago`;
  if (days < 14) return "Posted 1 week ago";
  if (days < 30) return `Posted ${Math.floor(days / 7)} weeks ago`;
  return `Posted ${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
}

/**
 * Generate a URL-friendly slug from job listing data.
 */
export function generateSlug(
  companyName: string,
  jobTitle: string,
  id: string
): string {
  const text = `${companyName}-${jobTitle}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  // Append short ID suffix for uniqueness
  const shortId = id.slice(0, 8);
  return `${text}-${shortId}`;
}
