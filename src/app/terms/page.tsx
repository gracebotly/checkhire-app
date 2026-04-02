import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Terms of Service | CheckHire",
  description: "CheckHire Terms of Service for our escrow-based gig work platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-display text-3xl font-bold text-slate-900">
          Terms of Service
        </h1>
        <p className="mt-4 text-sm text-slate-600">
          Last updated: March 30, 2026
        </p>
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-600">
          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              1. Agreement to Terms
            </h2>
            <p className="mt-2">
              By accessing or using CheckHire (&quot;the Platform&quot;), you
              agree to be bound by these Terms of Service. If you do not agree,
              do not use the Platform. You must be at least 18 years old to use
              CheckHire. These Terms incorporate our{" "}
              <a href="/privacy" className="text-brand hover:underline">
                Privacy Policy
              </a>{" "}
              by reference.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              2. Description of Service
            </h2>
            <p className="mt-2">
              CheckHire is an escrow-first gig transaction platform. We
              facilitate secure payments between clients and freelancers
              through escrow, shareable deal links, milestone payments, and
              human dispute resolution. CheckHire is NOT a marketplace (we
              don&apos;t match you with freelancers), NOT a payment processor
              (Stripe handles all payments), and NOT an employer of any
              freelancer on the platform.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              3. Account Registration
            </h2>
            <p className="mt-2">
              You must provide accurate information when creating an account.
              You are responsible for maintaining the security of your account
              credentials. You must notify us immediately at
              support@checkhire.co if you suspect unauthorized access to your
              account.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              4. Escrow Transactions
            </h2>

            <h3 className="mt-4 text-base font-medium text-slate-900">
              4.1 Deal Creation and Acceptance
            </h3>
            <p className="mt-2">
              Clients create deals with a title, description, deliverables, and
              amount. Freelancers accept deals by clicking the deal link. Both
              parties agree to the deal terms upon acceptance.
            </p>

            <h3 className="mt-4 text-base font-medium text-slate-900">
              4.2 Escrow Funding
            </h3>
            <p className="mt-2">
              The client pays the deal amount plus a 5% platform fee and
              Stripe&apos;s card processing fee (2.9% + $0.30) via Stripe. Funds are held in escrow until release conditions are
              met. The freelancer sees &quot;Payment Secured&quot; confirming
              funds are locked.
            </p>

            <h3 className="mt-4 text-base font-medium text-slate-900">
              4.3 Fund Release
            </h3>
            <p className="mt-2">
              Funds are released to the freelancer when the client confirms
              delivery, or automatically after the 72-hour review window (see
              4.4).
            </p>

            <h3 className="mt-4 text-base font-medium text-slate-900">
              4.4 The 72-Hour Auto-Release Rule
            </h3>
            <p className="mt-2">
              After the freelancer submits work, the client has 72 hours to
              review and take action (confirm delivery, request revision, or
              open a dispute). If the client takes no action within 72 hours,
              funds release to the freelancer automatically. This protects
              freelancers from unresponsive clients.
            </p>

            <h3 className="mt-4 text-base font-medium text-slate-900">
              4.5 Revision Requests
            </h3>
            <p className="mt-2">
              Clients may request up to 3 revisions before being required to
              confirm delivery or open a dispute. Each revision resets the
              72-hour review window.
            </p>

            <h3 className="mt-4 text-base font-medium text-slate-900">
              4.6 Cancellation and Refunds
            </h3>
            <p className="mt-2">
              Pre-work cancellation (before any work is submitted) results in a
              full refund to the client. Post-work disputes follow the dispute
              resolution process described in Section 6.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">5. Fees</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>
                <strong>Client platform fee:</strong> 5% of the deal amount
                + Stripe processing (2.9% + $0.30), charged at escrow funding
              </li>
              <li>
                <strong>Freelancer fee:</strong> 0% — freelancers receive
                exactly the posted amount
              </li>
              <li>
                <strong>Instant payout fee:</strong> A small fee for instant
                payouts to a debit card (standard bank transfers are free)
              </li>
              <li>
                <strong>Dispute fee:</strong> 5% of the deal amount, charged to
                the losing party at the discretion of the dispute reviewer
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              6. Dispute Resolution
            </h2>
            <p className="mt-2">
              Either party may open a dispute on a funded deal or within 14
              days of completion. When a dispute is opened:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>All funds are frozen immediately</li>
              <li>
                Both parties have 48 hours to submit evidence (screenshots,
                files, screen recordings, written descriptions)
              </li>
              <li>
                The CheckHire founder reviews all evidence within 48 hours
              </li>
              <li>
                A binding resolution is issued: full release to freelancer,
                full refund to client, or partial split
              </li>
              <li>
                A 5% dispute fee may be applied to the party found at fault
              </li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              7. Acceptable Use
            </h2>
            <p className="mt-2">You agree not to:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Use the Platform for fraudulent or illegal activities</li>
              <li>Use the Platform for money laundering</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Submit fake ratings or reviews</li>
              <li>Manipulate trust badges or completed deal counts</li>
              <li>
                Circumvent the escrow system (e.g., taking payment off-platform
                after connecting through a deal)
              </li>
              <li>Create multiple accounts to evade suspension</li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              8. Intellectual Property
            </h2>
            <p className="mt-2">
              CheckHire owns all rights to the Platform, its design, and its
              code. Users retain ownership of all content they create
              (descriptions, deliverables, uploaded files). By using the
              Platform, you grant CheckHire a limited license to display your
              content as necessary to operate the service.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              9. Stripe and Third-Party Services
            </h2>
            <p className="mt-2">
              Payments are processed by Stripe. By using CheckHire, you also
              agree to{" "}
              <a
                href="https://stripe.com/legal/connect-account"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                Stripe&apos;s Connected Account Agreement
              </a>
              . Stripe handles all KYC (Know Your Customer) verification for
              freelancers receiving payouts. CheckHire is not responsible for
              Stripe service interruptions.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              10. Disclaimer of Warranties
            </h2>
            <p className="mt-2">
              THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR
              IMPLIED. WE DO NOT WARRANT THAT THE PLATFORM WILL BE
              UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              11. Limitation of Liability
            </h2>
            <p className="mt-2">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, CHECKHIRE SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES. OUR TOTAL LIABILITY IS LIMITED TO THE FEES YOU
              HAVE PAID TO CHECKHIRE IN THE 12 MONTHS PRECEDING THE CLAIM, OR
              $100, WHICHEVER IS GREATER.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              12. Indemnification
            </h2>
            <p className="mt-2">
              You agree to indemnify and hold harmless CheckHire, its founders,
              employees, and agents from any claims, damages, or expenses
              arising from your use of the Platform or violation of these Terms.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              13. Termination
            </h2>
            <p className="mt-2">
              We may suspend or terminate your account for violation of these
              Terms. Upon termination, your data is retained for 30 days before
              deletion, except for transaction records required for legal
              compliance. You may terminate your account at any time through
              your account settings or by contacting support@checkhire.co.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              14. Governing Law
            </h2>
            <p className="mt-2">
              These Terms are governed by the laws of the United States. Any
              disputes arising from these Terms or your use of the Platform
              shall be resolved through binding arbitration administered by the
              American Arbitration Association (AAA) under its Commercial
              Arbitration Rules.
            </p>
          </section>

          {/* 15 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              15. Changes to Terms
            </h2>
            <p className="mt-2">
              We may update these Terms from time to time. For material
              changes, we will provide at least 14 days&apos; notice via email
              to registered users. Continued use of the Platform after changes
              take effect constitutes acceptance of the updated Terms.
            </p>
          </section>

          {/* 16 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              16. Contact
            </h2>
            <p className="mt-2">
              For questions about these Terms, contact us at{" "}
              <a
                href="mailto:support@checkhire.co"
                className="text-brand hover:underline"
              >
                support@checkhire.co
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
