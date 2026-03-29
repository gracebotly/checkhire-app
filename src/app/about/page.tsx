import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AboutContent } from "./about-content";

export const metadata: Metadata = {
  title: "About",
  description:
    "CheckHire is the trust-first job board. Learn why we built it and how we're different.",
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
