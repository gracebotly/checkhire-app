"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between py-4 text-left"
      >
        <span className="pr-4 text-sm font-semibold text-slate-900">{question}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-600 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-sm leading-relaxed text-slate-600">{answer}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQSection({
  title,
  items,
  openId,
  setOpenId,
}: {
  title: string;
  items: { id: string; question: string; answer: React.ReactNode }[];
  openId: string | null;
  setOpenId: (id: string | null) => void;
}) {
  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
      {items.map((item) => (
        <FAQItem
          key={item.id}
          question={item.question}
          answer={item.answer}
          isOpen={openId === item.id}
          onToggle={() => setOpenId(openId === item.id ? null : item.id)}
        />
      ))}
    </div>
  );
}

export function FAQContent() {
  const [openId, setOpenId] = useState<string | null>(null);

  const general = [
    {
      id: "g-what",
      question: "What is CheckHire?",
      answer:
        "CheckHire is a job board with built-in payment protection for online gig work. When you hire someone on Reddit, Facebook, Discord, or anywhere online, CheckHire provides a shareable payment link where funds are locked in escrow before work begins and released when the work is confirmed. You can also browse and post public gigs directly on CheckHire. Think of it as the safe way to pay (or get paid by) strangers on the internet.",
    },
    {
      id: "g-account",
      question: "Do I need to create an account?",
      answer:
        "Clients need an account to create gigs and fund escrow. Freelancers do not — they can accept a gig and get paid with just their name and email. If you want to build a reputation, earn trust badges, save templates, and track your deal history, creating a free account is recommended but never required to get paid.",
    },
  ];

  const freelancers = [
    {
      id: "f-cost",
      question: "How much does CheckHire cost for freelancers?",
      answer:
        "Nothing. Freelancers pay $0 in platform fees. You receive exactly the amount posted on the gig. The client covers the 5% CheckHire fee and Stripe processing fees. The only optional cost is instant payouts — if you want your money in seconds instead of 2 business days, there's a small fee ($1 or 1%, whichever is greater).",
    },
    {
      id: "f-paid",
      question: "How do I get paid?",
      answer:
        "When you accept a gig, you go through a quick Stripe verification (1–3 minutes) where you provide your name, address, bank details, and SSN or ITIN. After that, every time a deal completes, funds are sent directly to your bank account (2 business days) or your debit card (instantly, if you choose). CheckHire never holds your money — Stripe does.",
    },
    {
      id: "f-info",
      question: "What information does Stripe need from me?",
      answer:
        "Stripe asks for your legal name, date of birth, address, bank account or debit card for payouts, and your SSN or ITIN for 1099 tax reporting. Your information goes directly to Stripe — CheckHire never sees your SSN or bank account numbers.",
    },
    {
      id: "f-stripe",
      question: "Do I need a Stripe account already?",
      answer:
        "No. Stripe creates a connected account for you during the onboarding process. If you already have a Stripe account, the process is faster because Stripe can pre-fill your details — but it's not required.",
    },
    {
      id: "f-1099",
      question: "Will I receive a 1099?",
      answer:
        "If you earn $600 or more through CheckHire in a calendar year, you'll receive a 1099 tax form. Stripe handles this automatically — they'll email you when your form is ready.",
    },
    {
      id: "f-instant",
      question: "What are instant payouts?",
      answer:
        "Instead of waiting 2 business days for a bank transfer, you can receive your money in seconds to an eligible debit card — 24/7, including weekends and holidays. Instant payouts cost $1 or 1% of the payout amount, whichever is greater.",
    },
    {
      id: "f-ghost",
      question: "What if the client disappears after I deliver the work?",
      answer:
        "The 72-hour auto-release rule protects you. When you mark work as complete, the client has 72 hours to confirm delivery, request a revision, or open a dispute. If the client does nothing — the funds automatically release to you. No more chasing invoices or ghosted payments.",
    },
  ];

  const clients = [
    {
      id: "c-cost",
      question: "How much does CheckHire cost for clients?",
      answer:
        "You pay a 5% platform fee on top of the gig amount, plus Stripe's standard payment processing fee (~2.9% + $0.30). Your total cost is approximately 7.9% above what the freelancer receives. For example, on a $300 gig, you'd pay about $324 total — and the freelancer gets exactly $300. We show both fees upfront before you pay.",
    },
    {
      id: "c-methods",
      question: "What payment methods can I use?",
      answer:
        "Visa, Mastercard, American Express, Discover, Apple Pay, Google Pay, PayPal, Cash App Pay, and ACH bank transfer. More payment methods coming soon.",
    },
    {
      id: "c-deliver",
      question: "What happens if the freelancer doesn't deliver?",
      answer:
        "You have several protections. First, the 30-day auto-refund: if no freelancer accepts your gig within 30 days, you get a full refund automatically. Second, the 21-day evidence deadline: if a freelancer accepts but doesn't upload any evidence of work within 21 days, the escrow is refunded. Third, if work is delivered but doesn't match what was agreed, you can open a dispute within the 72-hour review window.",
    },
    {
      id: "c-refund",
      question: "Can I get a refund?",
      answer:
        "Yes, in several scenarios. If no freelancer accepts your gig (auto-refund after 30 days), if the freelancer doesn't submit evidence of work (auto-refund after 21 days), or if you win a dispute. Once you confirm delivery and funds are released, refunds are no longer available — the confirmation is final.",
    },
    {
      id: "c-72",
      question: "How does the 72-hour review period work?",
      answer:
        "When the freelancer marks work as complete, a 72-hour countdown begins. During this window, you can confirm delivery (funds release immediately), request a revision (the countdown pauses — up to 3 revisions), or open a dispute (funds freeze until resolved). If you don't take any action within 72 hours, funds auto-release to the freelancer. This protects freelancers from clients who ghost.",
    },
  ];

  const paymentsFees = [
    {
      id: "p-where",
      question: "Where does my money go when I fund escrow?",
      answer:
        "Your payment goes directly to Stripe — not to CheckHire and not to the freelancer. Stripe holds the funds securely until the deal is resolved (delivery confirmed, auto-released, or dispute settled). CheckHire never holds or touches the escrowed funds.",
    },
    {
      id: "p-why8",
      question: "Why is the total cost ~8% and not just 5%?",
      answer:
        "The 5% is CheckHire's platform fee. The additional ~2.9% + $0.30 is Stripe's standard payment processing fee for charging your card. We could have hidden Stripe's fee inside our 5% (which would mean CheckHire keeps only ~2%), but we chose transparency instead. You see exactly what goes where.",
    },
    {
      id: "p-other",
      question: "Are there any other fees?",
      answer:
        "The only additional fees are optional or situational. Instant payouts for freelancers ($1 or 1%, whichever is greater) are optional. Dispute fees (5% of the disputed amount) are charged to the losing party only if a dispute goes to human review. That's it.",
    },
    {
      id: "p-methods",
      question: "What payment methods does CheckHire accept?",
      answer:
        "Clients can fund escrow with Visa, Mastercard, American Express, Discover, Apple Pay, Google Pay, PayPal, Cash App Pay, and ACH bank transfer. Freelancers receive payouts to their US bank account or eligible debit card.",
    },
  ];

  const safety = [
    {
      id: "s-dispute",
      question: "How does dispute resolution work?",
      answer:
        "Both parties first propose how they think the funds should be split (e.g., the freelancer says “I deserve 80%” and the client says “refund me 50%”). If the proposals overlap, the system auto-resolves to the midpoint — no human needed. If they don't overlap, a human reviewer examines the evidence timeline and issues a decision within 48 hours.",
    },
    {
      id: "s-timeline",
      question: "What's the evidence timeline?",
      answer:
        "Every deal has a permanent, timestamped log of all activity — file uploads, text notes, status changes, and system events. Neither party can edit or delete entries. This is the primary evidence used in any dispute, so we strongly encourage both sides to document everything as the work progresses.",
    },
    {
      id: "s-scam",
      question: "What is the scam investigation service?",
      answer:
        "Anyone can submit a suspicious job posting from Reddit, Facebook, Discord, or anywhere online. Our team investigates it for free and provides a verdict (safe, suspicious, or confirmed scam). This service is completely free and doesn't require a CheckHire account. It's part of our mission to make online hiring safer for everyone.",
    },
  ];

  const accountPrivacy = [
    {
      id: "a-data",
      question: "What data does CheckHire store?",
      answer:
        "CheckHire stores your display name, email, deal history, activity logs, and profile information. Sensitive financial data — your SSN, tax ID, bank account numbers, and payment card details — are stored by Stripe, not by CheckHire. We never see or have access to your financial information.",
    },
    {
      id: "a-delete",
      question: "Can I delete my account?",
      answer:
        "Yes. Contact us and we'll delete your account and personal data. Note that deal activity logs and dispute evidence are retained for 90 days after deal completion for legal and compliance purposes, even after account deletion.",
    },
    {
      id: "a-share",
      question: "Is my information shared with the other party?",
      answer:
        "The other party on a deal can see your display name, profile photo (if set), trust badge, and deal-related activity (messages, files, status updates). They cannot see your email, real name (unless you choose to share it), financial details, or other deal history.",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900 md:text-3xl">Frequently Asked Questions</h1>
        <p className="mt-2 text-sm text-slate-600">Everything you need to know about using CheckHire</p>
      </div>

      <FAQSection title="General" items={general} openId={openId} setOpenId={setOpenId} />
      <FAQSection title="For Freelancers" items={freelancers} openId={openId} setOpenId={setOpenId} />
      <FAQSection title="For Clients" items={clients} openId={openId} setOpenId={setOpenId} />
      <FAQSection title="Payments & Fees" items={paymentsFees} openId={openId} setOpenId={setOpenId} />
      <FAQSection title="Safety & Disputes" items={safety} openId={openId} setOpenId={setOpenId} />
      <FAQSection title="Account & Privacy" items={accountPrivacy} openId={openId} setOpenId={setOpenId} />
    </div>
  );
}
