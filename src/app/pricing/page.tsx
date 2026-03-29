import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PricingContent } from "./pricing-content";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "CheckHire pricing for employers. Free for founding employers. Transparent pricing for gig and full-time job listings.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <PricingContent />
      </main>
      <Footer />
    </div>
  );
}
