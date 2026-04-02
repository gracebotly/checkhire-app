import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CreateWizard } from "@/components/gig/CreateWizard";

export const metadata: Metadata = {
  title: "Create a Protected Deal — CheckHire",
  description:
    "Turn any online deal into a protected transaction. Define the work, lock the payment, release with confidence. Freelancer keeps 100%.",
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
