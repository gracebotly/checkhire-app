import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "CheckHire Terms of Service.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-display text-3xl font-bold text-slate-900">
          Terms of Service
        </h1>
        <p className="mt-4 text-sm text-slate-600">Last updated: March 2026</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-600">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">1. Acceptance of Terms</h2>
            <p className="mt-2">
              By accessing or using CheckHire, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the platform. CheckHire reserves the right to update these terms at any time. Continued use after changes constitutes acceptance.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">2. Platform Description</h2>
            <p className="mt-2">
              CheckHire is a job board platform that connects verified employers with job seekers. The platform provides employer verification, applicant data protection through pseudonymous profiles, in-app communication, and escrow payment services for gig and temporary work.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">3. User Accounts</h2>
            <p className="mt-2">
              You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. You must not share your account with others or create multiple accounts. CheckHire may suspend or terminate accounts that violate these terms.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">4. Employer Obligations</h2>
            <p className="mt-2">
              Employers must complete the verification process for their chosen tier before posting listings. All job listings must include accurate compensation information. Employers must not request sensitive personal information (SSN, bank details, etc.) from candidates through the platform. Employers must respond to applications in a timely manner and close listings when positions are filled.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">5. Job Seeker Obligations</h2>
            <p className="mt-2">
              Job seekers must provide accurate information in their profiles and applications. Misrepresenting qualifications, experience, or identity is prohibited. Job seekers must not attempt to circumvent the pseudonym system or collect employer contact information for purposes other than legitimate job applications.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">6. Prohibited Content</h2>
            <p className="mt-2">
              The following are prohibited on CheckHire: multi-level marketing (MLM) or network marketing listings, listings requiring upfront fees from applicants, fraudulent or misleading job descriptions, data harvesting or scraping of candidate information, and any listing that violates applicable employment laws.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">7. Payment Terms</h2>
            <p className="mt-2">
              Listing fees are non-refundable once a listing is published. For gig jobs using escrow, funds are held until work is confirmed complete by both parties. Disputes are resolved through the platform&apos;s dispute resolution process. CheckHire charges a 5% platform fee on gig escrow transactions.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">8. Limitation of Liability</h2>
            <p className="mt-2">
              CheckHire is a platform that connects employers and job seekers. We do not guarantee employment outcomes. While we verify employers, we cannot guarantee the accuracy of all information in job listings. CheckHire is not liable for disputes between employers and job seekers beyond our escrow and dispute resolution services.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">9. Contact</h2>
            <p className="mt-2">
              For questions about these terms, contact us at legal@checkhire.com.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
