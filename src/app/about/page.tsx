import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AboutContent } from "./about-content";

export const metadata: Metadata = {
  title: "About — CheckHire",
  description:
    "CheckHire is the escrow payment link for gig work. Learn how we protect freelancers and clients from scams in online communities.",
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
