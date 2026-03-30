import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | CheckHire",
  description:
    "CheckHire Privacy Policy. How we collect, use, and protect your data on our escrow platform for gig work.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-display text-3xl font-bold text-slate-900">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-slate-600">
          Last updated: March 30, 2026
        </p>
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-600">
          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              1. Introduction
            </h2>
            <p className="mt-2">
              CheckHire (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
              operates the website at checkhire.com (the &quot;Platform&quot;).
              This Privacy Policy explains how we collect, use, disclose, and
              protect information from users of our escrow-based gig work
              platform, including both clients and freelancers.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              2. Information We Collect
            </h2>

            <h3 className="mt-4 text-base font-medium text-slate-900">
              2.1 Information You Provide Directly
            </h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>
                Account information: name, email address, and password (hashed)
              </li>
              <li>
                Profile information: display name, bio, avatar image, and
                profile slug
              </li>
              <li>
                Payment information: processed by Stripe — we do not store
                credit card numbers or full bank account details
              </li>
              <li>
                Deal information: gig titles, descriptions, deliverables,
                amounts, and deadlines
              </li>
              <li>
                Files uploaded to deal activity logs and dispute evidence
                (screenshots, documents, videos)
              </li>
              <li>
                Communications sent to support@checkhire.com
              </li>
            </ul>

            <h3 className="mt-4 text-base font-medium text-slate-900">
              2.2 Information Collected Automatically
            </h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>IP address, browser type, device type, and operating system</li>
              <li>Pages visited, actions taken, and usage patterns</li>
              <li>Session cookies required for authentication</li>
            </ul>

            <h3 className="mt-4 text-base font-medium text-slate-900">
              2.3 Information from Stripe
            </h3>
            <p className="mt-2">
              We receive payment confirmation status and payout status from
              Stripe. We do not access or store full card numbers, CVVs, or
              bank account details.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              3. How We Use Your Information
            </h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Account management and authentication</li>
              <li>Processing escrow transactions and fund releases</li>
              <li>
                Sending deal notifications (escrow funded, work submitted, auto-release
                warnings, dispute updates)
              </li>
              <li>Dispute resolution and evidence review</li>
              <li>Fraud detection and platform security</li>
              <li>Platform analytics and performance monitoring</li>
              <li>Legal compliance</li>
            </ul>
            <p className="mt-3 font-medium text-slate-900">
              We do NOT sell your data. We do NOT use your data for advertising.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              4. How We Share Your Information
            </h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>
                <strong>Service providers:</strong> Stripe (payment processing),
                Supabase (database hosting), Vercel (web hosting), Resend (email
                delivery)
              </li>
              <li>
                <strong>Deal participants:</strong> Limited information is shared
                between client and freelancer on a deal — display name, trust
                badge, and deal-related activity. Your email address is never
                shared with the other party.
              </li>
              <li>
                <strong>Legal requirements:</strong> We may disclose information
                when required by law, subpoena, or government request
              </li>
              <li>
                <strong>Business transfers:</strong> In the event of a merger,
                acquisition, or sale of assets, user data may be transferred
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              5. Escrow Transaction Data
            </h2>
            <p className="mt-2">
              Deal terms, amounts, activity logs, and dispute evidence are
              retained as transaction records. Both parties on a deal can see
              deal activity. During a dispute, evidence submitted by both
              parties is visible to both parties and the platform administrator
              who reviews the case.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              6. Cookies and Tracking
            </h2>
            <p className="mt-2">
              We use essential cookies for authentication and session
              management. We may use functional cookies to remember your
              preferences and analytics cookies to understand platform usage.
              You can disable cookies in your browser settings, but this may
              affect platform functionality.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              7. Data Retention
            </h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>
                Account data: retained until account deletion, then 30 days
              </li>
              <li>
                Deal activity logs: retained for 30 days after deal completion
              </li>
              <li>
                Dispute evidence: retained for 90 days after resolution
              </li>
              <li>
                Billing and transaction records: up to 7 years (tax compliance)
              </li>
              <li>
                Ratings: permanent (part of the public trust system)
              </li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              8. Data Security
            </h2>
            <p className="mt-2">
              All data is encrypted in transit using TLS. Database access is
              protected by Supabase Row Level Security (RLS). Payment data is
              handled by Stripe, which is PCI DSS compliant. Files in storage
              are accessed through signed, expiring URLs (15-minute expiry).
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              9. Your Privacy Rights
            </h2>
            <p className="mt-2">You have the right to:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Access all data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your data in a portable format</li>
              <li>Object to data processing</li>
              <li>
                Not be retaliated against for exercising your privacy rights
              </li>
            </ul>
            <p className="mt-3">
              California residents have additional rights under the CCPA. To
              exercise any privacy right, contact us at support@checkhire.com.
              We will respond within 45 days.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              10. Children&apos;s Privacy
            </h2>
            <p className="mt-2">
              CheckHire is not directed at individuals under the age of 18. We
              do not knowingly collect personal information from children.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              11. Changes to This Policy
            </h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. The
              &quot;Last updated&quot; date at the top reflects the most recent
              revision. For material changes, we will notify registered users by
              email.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              12. Contact
            </h2>
            <p className="mt-2">
              For privacy questions or data requests, contact us at{" "}
              <a
                href="mailto:support@checkhire.com"
                className="text-brand hover:underline"
              >
                support@checkhire.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
