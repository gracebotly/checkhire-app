import type { PayType, RemoteType, JobType } from "@/types/database";
import { formatSalary } from "@/lib/formatting";

/**
 * Generate JSON-LD structured data for a job listing (JobPosting schema).
 * This gets picked up by Google Jobs.
 */
export function generateJobPostingJsonLd(listing: {
  title: string;
  description: string;
  created_at: string;
  expires_at: string;
  salary_min: number | null;
  salary_max: number | null;
  pay_type: PayType;
  remote_type: RemoteType;
  job_type: JobType;
  location_city: string | null;
  location_state: string | null;
  location_country: string;
  employers: {
    company_name: string;
    website_domain: string | null;
  };
}) {
  const employmentTypeMap: Record<JobType, string> = {
    full_time: "FULL_TIME",
    part_time: "PART_TIME",
    contract: "CONTRACTOR",
    gig: "TEMPORARY",
    temp: "TEMPORARY",
  };

  const unitTextMap: Record<PayType, string> = {
    salary: "YEAR",
    hourly: "HOUR",
    project: "YEAR",
    commission: "YEAR",
  };

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: listing.title,
    description: listing.description.slice(0, 5000),
    datePosted: listing.created_at,
    validThrough: listing.expires_at,
    employmentType: employmentTypeMap[listing.job_type] || "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: listing.employers.company_name,
      ...(listing.employers.website_domain && {
        sameAs: `https://${listing.employers.website_domain}`,
      }),
    },
  };

  // Salary
  if (listing.salary_min != null || listing.salary_max != null) {
    jsonLd.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: {
        "@type": "QuantitativeValue",
        ...(listing.salary_min != null && { minValue: listing.salary_min }),
        ...(listing.salary_max != null && { maxValue: listing.salary_max }),
        unitText: unitTextMap[listing.pay_type] || "YEAR",
      },
    };
  }

  // Remote
  if (listing.remote_type === "full_remote") {
    jsonLd.jobLocationType = "TELECOMMUTE";
    jsonLd.applicantLocationRequirements = {
      "@type": "Country",
      name: listing.location_country || "US",
    };
  } else if (listing.location_city || listing.location_state) {
    jsonLd.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        ...(listing.location_city && {
          addressLocality: listing.location_city,
        }),
        ...(listing.location_state && {
          addressRegion: listing.location_state,
        }),
        addressCountry: listing.location_country || "US",
      },
    };
  }

  return jsonLd;
}

/**
 * Generate Next.js Metadata for a job listing page.
 */
export function generateListingMetadata(listing: {
  title: string;
  salary_min: number | null;
  salary_max: number | null;
  pay_type: PayType;
  remote_type: RemoteType;
  employers: { company_name: string };
}) {
  const salary = formatSalary(
    listing.salary_min,
    listing.salary_max,
    listing.pay_type
  );
  const remoteLabel =
    listing.remote_type === "full_remote"
      ? "Remote"
      : listing.remote_type === "hybrid"
        ? "Hybrid"
        : "On-site";

  return {
    title: `${listing.title} at ${listing.employers.company_name}`,
    description: `${listing.title} — ${salary} — ${remoteLabel} — Apply on CheckHire, the verified job board.`,
    openGraph: {
      title: `${listing.title} at ${listing.employers.company_name}`,
      description: `${salary} | ${remoteLabel} | Verified employer`,
    },
  };
}

/**
 * Generate Next.js Metadata for an employer profile page.
 */
export function generateEmployerMetadata(employer: {
  company_name: string;
  industry: string | null;
  description: string | null;
}) {
  return {
    title: `${employer.company_name} — Company Profile`,
    description:
      employer.description?.slice(0, 160) ||
      `${employer.company_name} on CheckHire — verified employer profile${employer.industry ? ` in ${employer.industry}` : ""}.`,
    openGraph: {
      title: `${employer.company_name} on CheckHire`,
      description: `Verified employer${employer.industry ? ` in ${employer.industry}` : ""}. View open positions.`,
    },
  };
}
