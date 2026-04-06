import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AboutContent } from "./about-content";

export const metadata: Metadata = {
  title: "About — CheckHire",
  description:
    "CheckHire is the escrow payment link for creators, freelancers, and gig workers. Lock payment before work starts. Keep 100% of what you earn.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <AboutContent />
      </main>
      <Footer />
    </div>
  );
}
