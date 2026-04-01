import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FAQContent } from "@/components/faq/FAQContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — CheckHire",
  description:
    "Frequently asked questions about CheckHire escrow payments for freelancers and clients.",
};

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pb-20 md:pb-0">
        <FAQContent />
      </main>
      <Footer />
    </div>
  );
}
