import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CreateWizard } from "@/components/gig/CreateWizard";

export const metadata: Metadata = {
  title: "Create a Payment Link — CheckHire",
  description:
    "Create an escrow-backed payment link in under 3 minutes. Share it on Reddit, Discord, or anywhere. Freelancer keeps 100%.",
};

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pb-20 md:pb-0">
        <CreateWizard />
      </main>
      <Footer />
    </div>
  );
}
