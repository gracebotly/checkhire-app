import { NextResponse } from "next/server";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /api/employer/profile — Returns the current user's employer profile.
 */
export const GET = withApiHandler(async function GET() {
  const ctx = await getEmployerForUser();

  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    employer: ctx.employer,
    role: ctx.role,
  });
});

/**
 * PATCH /api/employer/profile — Update employer profile fields.
 * Only admins can change company_name. All linked users can update other fields.
 */

const ALLOWED_FIELDS = [
  "company_name",
  "website_domain",
  "description",
  "industry",
  "company_size",
  "country",
] as const;

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Marketing",
  "Design",
  "Sales",
  "Engineering",
  "Legal",
  "Consulting",
  "Real Estate",
  "Media",
  "Nonprofit",
  "Government",
  "Retail",
  "Manufacturing",
  "Other",
];

const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5000+",
];

const COUNTRIES = [
  "US",
  "CA",
  "GB",
  "DE",
  "FR",
  "AU",
  "NL",
  "SE",
  "CH",
  "IE",
  "IN",
  "SG",
  "JP",
  "BR",
  "MX",
  "Other",
];

export const PATCH = withApiHandler(async function PATCH(req: Request) {
  const ctx = await getEmployerForUser();

  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, string> = {};

  // Validate and collect updates
  for (const field of ALLOWED_FIELDS) {
    if (field in body && body[field] !== undefined) {
      const value = String(body[field]).trim();

      switch (field) {
        case "company_name":
          // Only admins can change company name
          if (ctx.role !== "admin") {
            return NextResponse.json(
              { ok: false, code: "ADMIN_REQUIRED", message: "Only admins can change the company name." },
              { status: 403 }
            );
          }
          if (value.length < 2 || value.length > 100) {
            return NextResponse.json(
              { ok: false, code: "INVALID_NAME", message: "Company name must be 2-100 characters." },
              { status: 400 }
            );
          }
          updates[field] = value;
          break;

        case "website_domain":
          if (value) {
            // Strip protocol and trailing slashes
            const cleaned = value
              .replace(/^https?:\/\//, "")
              .replace(/\/+$/, "")
              .toLowerCase();
            if (cleaned.length > 0 && !cleaned.includes(" ")) {
              updates[field] = cleaned;
            }
          } else {
            updates[field] = "";
          }
          break;

        case "description":
          if (value.length > 2000) {
            return NextResponse.json(
              { ok: false, code: "DESCRIPTION_TOO_LONG", message: "Description must be under 2000 characters." },
              { status: 400 }
            );
          }
          updates[field] = value;
          break;

        case "industry":
          if (value && !INDUSTRIES.includes(value)) {
            return NextResponse.json(
              { ok: false, code: "INVALID_INDUSTRY", message: "Invalid industry selection." },
              { status: 400 }
            );
          }
          updates[field] = value;
          break;

        case "company_size":
          if (value && !COMPANY_SIZES.includes(value)) {
            return NextResponse.json(
              { ok: false, code: "INVALID_SIZE", message: "Invalid company size selection." },
              { status: 400 }
            );
          }
          updates[field] = value;
          break;

        case "country":
          if (value && !COUNTRIES.includes(value)) {
            return NextResponse.json(
              { ok: false, code: "INVALID_COUNTRY", message: "Invalid country selection." },
              { status: 400 }
            );
          }
          updates[field] = value;
          break;
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { ok: false, code: "NO_CHANGES", message: "No valid fields to update." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("employers")
    .update(updates)
    .eq("id", ctx.employerId)
    .select(
      `
      id, company_name, website_domain, description, industry,
      company_size, country, logo_url, tier_level, slug,
      domain_email_verified_at, created_at
    `
    )
    .single();

  if (error) {
    console.error("[api/employer/profile] Update error:", error.message);
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Failed to update profile." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, employer: updated });
});
