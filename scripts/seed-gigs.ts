import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("Make sure your .env.local file has these values.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface SeedGig {
  title: string;
  description: string;
  deliverables: string;
  total_amount: number;
  category: string;
  deadline_days: number;
  slug: string;
  hours_ago: number;
}

const SEED_GIGS: SeedGig[] = [
  {
    title: "Build a responsive landing page for my SaaS product",
    description:
      "I need a clean, mobile-first landing page for my B2B SaaS tool. It should load fast, have a hero section with email capture, feature highlights, pricing comparison, and a footer. Design files will be provided in Figma. Must be built with Next.js and Tailwind CSS.",
    deliverables:
      "Fully responsive landing page deployed to Vercel. Source code in a GitHub repo. Matches the Figma design within 95% accuracy. Lighthouse performance score above 90.",
    total_amount: 50000,
    category: "web_dev",
    deadline_days: 14,
    slug: "seed0001",
    hours_ago: 2,
  },
  {
    title: "Logo design for a fintech startup",
    description:
      "We are launching a new peer-to-peer payment app and need a professional logo. Looking for something modern, clean, and trustworthy. Think Stripe or Wise energy — not overly playful. We need the logo in SVG, PNG, and favicon formats. Color and monochrome versions.",
    deliverables:
      "Primary logo (color + monochrome). Icon/favicon version. SVG and PNG at multiple resolutions. Brand color palette with hex codes. Simple usage guidelines (1 page).",
    total_amount: 30000,
    category: "design",
    deadline_days: 10,
    slug: "seed0002",
    hours_ago: 5,
  },
  {
    title: "Write 5 blog posts about cybersecurity for small businesses",
    description:
      "I run a managed IT services company and need 5 SEO-optimized blog posts targeting small business owners who know nothing about cybersecurity. Each post should be 1,200-1,500 words, include practical tips (not just fear mongering), and be written in plain English. Topics will be provided.",
    deliverables:
      "Five blog posts in Google Docs format. Each 1,200-1,500 words. SEO meta title and description for each post. Internal linking suggestions. One round of revisions included.",
    total_amount: 25000,
    category: "writing",
    deadline_days: 21,
    slug: "seed0003",
    hours_ago: 24,
  },
  {
    title: "Edit a 10-minute YouTube product review video",
    description:
      "I have raw footage of a product review (about 25 minutes of footage) that needs to be cut down to a polished 8-10 minute video. Need jump cuts, b-roll integration (I will provide b-roll), lower thirds, intro/outro, background music, and color correction. Final export in 4K.",
    deliverables:
      "Edited video exported in 4K MP4. Premiere Pro or DaVinci Resolve project file. Thumbnail design (YouTube-ready, 1280x720). Caption/subtitle file (SRT format).",
    total_amount: 40000,
    category: "video",
    deadline_days: 7,
    slug: "seed0004",
    hours_ago: 3,
  },
  {
    title: "Set up and manage a Google Ads campaign for a local gym",
    description:
      "I own a CrossFit gym in Austin, TX and need someone to set up a Google Ads campaign targeting local leads. Budget is $500/month for ad spend (separate from this gig fee). Need keyword research, ad copy, landing page recommendations, conversion tracking setup, and 2 weeks of management with a performance report.",
    deliverables:
      "Google Ads campaign live and running. Keyword research document. 3 ad variations per ad group. Conversion tracking verified. End-of-campaign performance report with recommendations.",
    total_amount: 35000,
    category: "marketing",
    deadline_days: 14,
    slug: "seed0005",
    hours_ago: 8,
  },
  {
    title: "Research and compile a list of 200 SaaS companies for outreach",
    description:
      "I need a researched list of 200 B2B SaaS companies (Series A to Series C) in the US market. For each company I need: company name, website, CEO/founder name, CEO LinkedIn URL, company email format, estimated employee count, and what their product does (one sentence). Delivered in a clean spreadsheet.",
    deliverables:
      "Google Sheet with 200 verified entries. All required columns filled. No duplicates. Sources verified (LinkedIn profiles must be active). Delivered within 5 business days.",
    total_amount: 15000,
    category: "virtual_assistant",
    deadline_days: 5,
    slug: "seed0006",
    hours_ago: 12,
  },
  {
    title: "Mix and master 3 podcast episodes",
    description:
      "I record a weekly interview podcast and need someone to handle post-production. Each episode is about 45 minutes raw. Need noise removal, EQ, compression, leveling between host and guest, intro/outro music integration (I will provide the music), and export in MP3 (192kbps) and WAV formats.",
    deliverables:
      "Three fully mixed and mastered podcast episodes. MP3 and WAV exports for each. Consistent loudness across all three episodes (-16 LUFS). Turnaround: 48 hours per episode.",
    total_amount: 20000,
    category: "audio",
    deadline_days: 10,
    slug: "seed0007",
    hours_ago: 6,
  },
  {
    title: "Translate a mobile app from English to Spanish (Latin American)",
    description:
      "I have a React Native app with about 800 strings that need to be translated from English to Latin American Spanish. This is a consumer finance app so accuracy with financial terminology is critical. I will provide the strings in a JSON file. Need the translated JSON back with the same keys.",
    deliverables:
      "Translated JSON file with all 800 strings. Latin American Spanish (not European). Financial terminology verified. Consistent tone across all strings. One round of revisions.",
    total_amount: 45000,
    category: "translation",
    deadline_days: 12,
    slug: "seed0008",
    hours_ago: 4,
  },
];

async function getOrCreateSeedClient(): Promise<string> {
  // Check if a seed client already exists
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("display_name", "Seed Client")
    .maybeSingle();

  if (existing) {
    console.log(`Using existing seed client: ${existing.id}`);
    return existing.id;
  }

  // Look for any user to use as the client — pick the first one
  const { data: anyUser } = await supabase
    .from("user_profiles")
    .select("id, display_name")
    .limit(1)
    .maybeSingle();

  if (anyUser) {
    console.log(`Using existing user as seed client: ${anyUser.display_name} (${anyUser.id})`);
    return anyUser.id;
  }

  console.error("No users found in user_profiles. Please create an account first, then run this script.");
  process.exit(1);
}

async function seed() {
  console.log("Starting seed...\n");

  const clientId = await getOrCreateSeedClient();

  let created = 0;
  let skipped = 0;

  for (const gig of SEED_GIGS) {
    // Check if this slug already exists (idempotent)
    const { data: existing } = await supabase
      .from("deals")
      .select("id")
      .eq("deal_link_slug", gig.slug)
      .maybeSingle();

    if (existing) {
      console.log(`  Skipping "${gig.title}" — slug ${gig.slug} already exists`);
      skipped++;
      continue;
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + gig.deadline_days);

    const createdAt = new Date();
    createdAt.setHours(createdAt.getHours() - gig.hours_ago);

    const { error } = await supabase.from("deals").insert({
      title: gig.title,
      description: gig.description,
      deliverables: gig.deliverables,
      total_amount: gig.total_amount,
      currency: "usd",
      deadline: deadline.toISOString(),
      deal_type: "public",
      deal_link_slug: gig.slug,
      category: gig.category,
      client_user_id: clientId,
      status: "pending_acceptance",
      escrow_status: "unfunded",
      has_milestones: false,
      payment_frequency: "one_time",
      created_at: createdAt.toISOString(),
    });

    if (error) {
      console.error(`  Error seeding "${gig.title}":`, error.message);
    } else {
      console.log(`  Created: "${gig.title}" ($${(gig.total_amount / 100).toFixed(2)}) — /deal/${gig.slug}`);
      created++;
    }
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`);
  console.log("Browse gigs at: /gigs");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
