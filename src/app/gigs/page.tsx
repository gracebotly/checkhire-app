import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BrowseGigsContent } from "@/components/gig/BrowseGigsContent";

export const metadata: Metadata = {
  title: "Browse Gigs — Protected Freelance Work",
  description:
    "Browse open gigs with deal protection. Funded gigs have payment secured before work starts. Apply and get paid safely.",
};

export default function BrowseGigsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pb-20 md:pb-0">
        <BrowseGigsContent />
      </main>
      <Footer />
    </div>
  );
}
