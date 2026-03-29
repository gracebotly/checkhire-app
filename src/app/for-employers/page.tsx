import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ForEmployersContent } from "./for-employers-content";

export const metadata: Metadata = {
  title: "For Employers",
  description:
    "Post verified job listings on CheckHire. Attract better candidates with trust badges, transparency scores, and verified employer status.",
};

export default function ForEmployersPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <ForEmployersContent />
      </main>
      <Footer />
    </div>
  );
}
