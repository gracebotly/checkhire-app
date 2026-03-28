import { createServiceClient } from "@/lib/supabase/service";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/marketing/Hero";
import { TrustPillars } from "@/components/marketing/TrustPillars";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { JobPreviewGrid } from "@/components/marketing/JobPreviewGrid";
import { EmployerCTA } from "@/components/marketing/EmployerCTA";

export default async function HomePage() {
  // Fetch 6 recent active listings for the preview grid
  const supabase = createServiceClient();
  const { data: listings } = await supabase
    .from("job_listings")
    .select(
      `
      *,
      employers!inner (
        company_name,
        tier_level,
        logo_url,
        transparency_score,
        industry,
        company_size,
        website_domain,
        description,
        country,
        slug
      )
    `
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <TrustPillars />
        <HowItWorks />
        <JobPreviewGrid listings={listings || []} />
        <EmployerCTA />
      </main>
      <Footer />
    </div>
  );
}
