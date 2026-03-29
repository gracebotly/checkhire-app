import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "CheckHire Privacy Policy. How we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-display text-3xl font-bold text-slate-900">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-slate-600">Last updated: March 2026</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-600">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">1. Overview</h2>
            <p className="mt-2">
              CheckHire is built around data protection. This privacy policy explains what data we collect, how we use it, and how we protect it. Our core principle: your personal data is revealed only in stages, under your control, and never sold to third parties.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">2. Data We Collect</h2>
            <p className="mt-2">
              We collect the following categories of data: account information (name, email, password hash), profile information (skills, experience, education for job seekers; company details for employers), application data (screening responses, video applications), and platform usage data (actions taken within the platform for transparency scoring and anti-fraud detection).
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">3. The Pseudonym System</h2>
            <p className="mt-2">
              When you apply to a job on CheckHire, you are assigned a random pseudonym (e.g., &quot;Silver Oak&quot;). The employer sees only your pseudonym, skills, and screening responses — not your name, email, or resume. Your identity is revealed progressively: first name at the interview stage (with your consent), full name after the interview. Your real email and phone number are never shared with employers.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">4. How We Use Your Data</h2>
            <p className="mt-2">
              We use your data to: match you with relevant job opportunities, enable communication between employers and candidates through masked channels, calculate employer transparency scores, detect and prevent fraud, and send platform notifications (new messages, application updates, post-hire check-ins).
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">5. Data We Never Share</h2>
            <p className="mt-2">
              We never sell your personal data. We never share your email or phone number with employers (all communication flows through masked relay addresses). We never allow employers to bulk-export or download candidate data. We never share your data with advertisers.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">6. Data Retention</h2>
            <p className="mt-2">
              Applicant video submissions are deleted 90 days after the listing closes. Application records are archived after 1 year. Chat messages are deleted after 1 year of inactivity. Escrow transaction records are retained for 7 years (tax compliance). You can request deletion of your data at any time through your account settings.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">7. Security</h2>
            <p className="mt-2">
              All data is encrypted at rest (AES-256) and in transit (TLS). Sensitive PII fields are encrypted at the application layer. Resume and video files are accessed through signed, expiring URLs (15-minute expiry). Row-Level Security ensures users can only access data they are authorized to see. All employer access to candidate data is logged for anti-fraud detection.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">8. Your Rights</h2>
            <p className="mt-2">
              You have the right to: access all data we hold about you, request correction of inaccurate data, request deletion of your account and associated data, export your data in a portable format, and withdraw consent for data processing at any time.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">9. Contact</h2>
            <p className="mt-2">
              For privacy questions or data requests, contact us at privacy@checkhire.com.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
