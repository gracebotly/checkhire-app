"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function FAQItem({ id, question, answer, isOpen, onToggle }: {
  id: string;
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
        className="flex w-full cursor-pointer items-center justify-between py-4 text-left transition-colors duration-200"
      >
        <span className="text-sm font-semibold text-slate-900 pr-4">{question}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-600 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
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
            <div className="pb-4 text-sm text-slate-600 leading-relaxed">{answer}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQSection({ title, id, items, openId, setOpenId }: {
  title: string;
  id?: string;
  items: { id: string; question: string; answer: React.ReactNode }[];
  openId: string | null;
  setOpenId: (id: string | null) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4" id={id}>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      {items.map((item) => (
        <FAQItem
          key={item.id}
          id={item.id}
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
  const [activeTab, setActiveTab] = useState("freelancer");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.hash === "#acceptable-use") {
      setActiveTab("client");
      setTimeout(() => {
        document.getElementById("acceptable-use")?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    }
  }, []);

  const freelancerGettingPaid = [
    {
      id: "f-account",
      question: "Do I need to create an account to get paid?",
      answer: "No. You accept a gig with just your email and name — no CheckHire account required. When it's time to get paid, Stripe (our payment processor) collects your bank details directly. CheckHire never sees your bank information, SSN, or tax details — everything goes through Stripe's secure system.",
    },
    {
      id: "f-cost",
      question: "How much does CheckHire cost me?",
      answer: "Nothing. Zero. The client pays all fees. You receive exactly the amount posted on the gig — no deductions, no hidden charges, no percentage taken. Ever.",
    },
    {
      id: "f-receive",
      question: "How do I receive my money?",
      answer: (
        <div className="space-y-2">
          <p>All payouts go through Stripe Connect. You have two options:</p>
          <p><span className="font-semibold text-slate-900">Standard payout (free):</span> 2 business days to your bank account. Works with traditional banks and virtual banks like Revolut, Wise, and N26.</p>
          <p><span className="font-semibold text-slate-900">Instant payout ($1 or 1%, whichever is greater):</span> Straight to an eligible debit card in seconds, available 24/7 including weekends and holidays. Only available in select countries (see below).</p>
        </div>
      ),
    },
    {
      id: "f-instant",
      question: "How does instant payout work?",
      answer: "If you're in a supported country with an eligible debit card, you can choose instant payout when your funds are released. The money arrives in seconds — even on weekends and holidays. There's a small fee ($1 or 1% of the payout, whichever is greater). Instant payouts are currently available in the US, Canada, UK, EU, Australia, Singapore, Norway, New Zealand, Malaysia, Hong Kong, and UAE only. Your debit card must be eligible — Stripe will tell you during setup if yours qualifies.",
    },
    {
      id: "f-countries",
      question: "What countries are supported?",
      answer: "CheckHire works in 46+ countries through Stripe Connect. This includes the US, Canada, UK, EU countries, Australia, Japan, Singapore, and many more. When you accept a gig, Stripe's onboarding process will confirm whether your country is supported and which payout methods are available to you.",
    },
    {
      id: "f-stripe-needs",
      question: "What does Stripe need from me?",
      answer: "To receive payouts, Stripe requires: your name, date of birth, address, a bank account or debit card, and tax information (SSN or ITIN in the US, local tax ID for other countries). This is standard Know Your Customer (KYC) verification required by financial regulations worldwide. CheckHire never sees or stores this information — it goes directly to Stripe.",
    },
    {
      id: "f-ghost",
      question: "What if the client ghosts me after I deliver?",
      answer: "You're protected. When you submit your work, a 72-hour countdown starts — visible to both you and the client. If the client doesn't respond within 72 hours, the funds automatically release to you. No action needed on your part. The money comes to you by default.",
    },
  ];

  const freelancerDoingTheWork = [
    {
      id: "f-timeline",
      question: "What is the evidence timeline?",
      answer: "Every gig has a timestamped record of all events — when the gig was created, when escrow was funded, when you accepted, every file you upload, when you submit work, and when payment releases. This is not a chat — it's a permanent, non-deletable transaction record. It protects both parties because there's always a clear paper trail.",
    },
    {
      id: "f-evidence",
      question: "Do I have to upload evidence before submitting?",
      answer: "Yes. You must upload at least one piece of evidence (screenshots, files, links, or any proof of work) before marking work as complete. This protects you — if the client disputes the delivery, your evidence is already timestamped and on record. Think of it as your receipt.",
    },
    {
      id: "f-revisions",
      question: "What if the client asks for revisions?",
      answer: "The client can request up to 3 revisions. Each revision pauses the 72-hour auto-release countdown. If you and the client can't agree on what constitutes \"complete\" work, either party can open a dispute.",
    },
  ];

  const freelancerDisputes = [
    {
      id: "f-dispute",
      question: "What happens if there's a dispute?",
      answer: "Our dispute system is designed to resolve itself without a human in most cases. Both parties propose how to split the funds using a percentage slider — you see the real dollar amounts for each side. If your proposals overlap or match, the system auto-resolves immediately and money moves. If they don't overlap, you each get one more round to adjust. Only if two rounds fail does a human reviewer step in.",
    },
    {
      id: "f-dispute-lose",
      question: "Do I lose all my money in a dispute?",
      answer: "No. You propose what percentage you believe is fair based on the work you delivered. If you completed some of the work, you can propose keeping that portion. Disputes are about finding a fair split, not all-or-nothing. The losing party in a human-reviewed dispute pays a 5% dispute fee on the disputed amount.",
    },
  ];

  const clientCreatingFunding = [
    {
      id: "c-create",
      question: "How do I create a payment link?",
      answer: "Click \"Create a Payment Link\" and follow the wizard: pick a category, enter a title and budget, create your account, then fill in the full details. Fund escrow with any major payment method and you'll get a shareable link in under 3 minutes.",
    },
    {
      id: "c-methods",
      question: "What payment methods can I use to fund escrow?",
      answer: "Visa, Mastercard, American Express, Discover, Apple Pay, Google Pay, PayPal, Cash App Pay, and ACH bank transfer. All payments are processed securely by Stripe.",
    },
    {
      id: "c-cost",
      question: "How much does it cost?",
      answer: "You pay the freelancer's amount plus a 5% CheckHire platform fee and standard Stripe payment processing (~2.9% + $0.30). The freelancer receives exactly the amount you posted — they pay zero fees. Example: You want to pay a freelancer $300. Platform fee (5%) = $15.00. Payment processing = $9.44. Total charged to you = $324.44. The freelancer receives exactly $300.00.",
    },
    {
      id: "c-nobody",
      question: "What if nobody accepts my gig?",
      answer: "If nobody accepts within 30 days, you get a full automatic refund. No questions asked, no fees charged. We send you reminder emails at 14 and 27 days so you're never surprised.",
    },
    {
      id: "c-cancel",
      question: "Can I cancel after funding?",
      answer: "Yes, if no freelancer has accepted yet — full instant refund. If a freelancer accepted but hasn't uploaded any evidence yet — full refund. If the freelancer has uploaded evidence, you must use the dispute flow instead. This prevents bad-faith cancellations after someone has already started working.",
    },
    {
      id: "c-frequency",
      question: "What are payment frequencies?",
      answer: "When creating a gig, you choose how often you plan to pay: One-time, Weekly, Biweekly, or Monthly. This describes the nature of the work arrangement. Currently, each payment period is funded as a separate escrow transaction. For ongoing work, you can use \"Repeat this gig\" for quick re-creation. Automated recurring funding is on our roadmap.",
    },
  ];

  const clientSharingDistribution = [
    {
      id: "c-share",
      question: "Where can I share my payment link?",
      answer: "Anywhere a URL works — Reddit, Facebook, Discord, WhatsApp, Twitter/X, email, text message, or any other platform. After creating your gig, the Share Hub gives you pre-formatted messages optimized for each platform. Your link works the same everywhere.",
    },
    {
      id: "c-freelancer-account",
      question: "Does the freelancer need a CheckHire account?",
      answer: "No. They click your link, enter their email and name, and accept the gig. They complete Stripe's identity verification only when it's time to receive their payout. This is Stripe's standard process, not CheckHire's. The goal is zero friction for the person doing the work.",
    },
  ];

  const clientManagingGig = [
    {
      id: "c-submitted",
      question: "What happens after the freelancer submits work?",
      answer: "You have 72 hours to: confirm delivery (funds release to the freelancer), request a revision (up to 3 — the countdown pauses), or open a dispute (funds freeze). If you do nothing within 72 hours, the funds automatically release to the freelancer.",
    },
    {
      id: "c-autorelease",
      question: "How does the 72-hour auto-release work?",
      answer: "It protects freelancers from clients who disappear after receiving completed work. When the freelancer marks work as complete, a visible countdown starts on the deal page. If you don't take any action within 72 hours, the money releases automatically. This is a core feature — it's what makes freelancers trust the platform enough to start working.",
    },
    {
      id: "c-physical",
      question: "Can I use CheckHire for physical or in-person work?",
      answer: "Yes — there's no rule against it. Screenshots, photos, video recordings, and GPS-stamped evidence are all valid in the evidence timeline. That said, CheckHire was designed primarily for remote digital services, and our dispute resolution works best when the deliverable can be clearly shown in a file or screenshot. For physical work, we strongly recommend being extra detailed about deliverables in the gig description and uploading thorough photo/video evidence throughout the process.",
    },
  ];

  const clientAcceptableUse = [
    {
      id: "c-allowed",
      question: "What services are allowed on CheckHire?",
      answer: "CheckHire supports remote digital services across nine categories: Web & App Development, Design & Branding, Writing & Content, Video & Animation, Marketing & Social Media, Virtual Assistant, Audio & Music, Translation & Localization, and Other Digital Services. Physical and in-person services are also permitted as long as deliverables can be documented with evidence.",
    },
    {
      id: "c-prohibited",
      question: "What services are NOT allowed?",
      answer: (
        <div className="space-y-2">
          <p>The following are prohibited on CheckHire and will result in gig removal and potential account suspension:</p>
          <p><span className="font-semibold text-slate-900">Illegal activity</span> — anything illegal under US federal law or the laws of either party{"'"}s country.</p>
          <p><span className="font-semibold text-slate-900">Weapons and violence</span> — firearms, ammunition, explosives, or any weapon-related services.</p>
          <p><span className="font-semibold text-slate-900">Drugs and controlled substances</span> — services related to illegal drugs, drug paraphernalia, or controlled substances.</p>
          <p><span className="font-semibold text-slate-900">Adult content</span> — escort services, OnlyFans agency management, pornographic content creation, or any sexually explicit services.</p>
          <p><span className="font-semibold text-slate-900">Academic and workplace fraud</span> — writing essays, taking exams, completing homework, writing dissertations, doing coursework, or completing any assignment meant to be the student{"'"}s or employee{"'"}s own work. Tutoring and proofreading are allowed.</p>
          <p><span className="font-semibold text-slate-900">Hacking and cybercrime</span> — unauthorized access to systems, DDoS attacks, phishing, ransomware, malware creation, or bypassing security systems.</p>
          <p><span className="font-semibold text-slate-900">Fake engagement</span> — purchasing fake reviews, fake followers, bot traffic, click farms, or any artificial engagement manipulation.</p>
          <p><span className="font-semibold text-slate-900">Account fraud</span> — buying, selling, or renting social media accounts or platform accounts.</p>
          <p><span className="font-semibold text-slate-900">Financial fraud</span> — counterfeit documents, fake IDs, forged documents, money laundering, credit card fraud, or identity theft services.</p>
          <p><span className="font-semibold text-slate-900">Gambling</span> — casino-related services, sports betting bots, or gambling platform development.</p>
          <p><span className="font-semibold text-slate-900">Deepfakes</span> — creating deepfake videos, voice clones, or manipulated media intended to deceive or impersonate.</p>
          <p><span className="font-semibold text-slate-900">Third-party violations</span> — any service that requires violating another platform{"'"}s terms of service.</p>
          <p className="mt-2 text-xs text-slate-600">This list is not exhaustive. CheckHire reserves the right to remove any gig that poses a risk to our community.</p>
        </div>
      ),
    },
    {
      id: "c-flagged",
      question: "What happens if my gig is flagged?",
      answer: "Some gigs are automatically flagged for human review. This includes all gigs in the \"Other Digital Services\" category and first-time users' first gig. Flagged gigs still publish and function normally — flagging is an internal review process, not a block. If our team determines the gig violates our policies after review, we'll notify you by email and issue a full refund.",
    },
    {
      id: "c-blocked",
      question: "What if I think my gig was incorrectly blocked?",
      answer: (
        <>
          If your gig was rejected during creation, it{"'"}s likely because the title or description contained keywords that match our prohibited services list. Contact us at{" "}
          <Link href="/contact" className="font-semibold text-brand cursor-pointer transition-colors duration-200 hover:text-brand-hover">
            support
          </Link>{" "}
          with a description of the service you{"'"}re offering and we{"'"}ll review it manually. Most blocks are keyword matches that don{"'"}t apply to your specific case.
        </>
      ),
    },
  ];

  const clientRedditCommunity = [
    {
      id: "c-reddit-what",
      question: "What is the CheckHire Reddit community?",
      answer: (
        <>
          We operate{" "}
          <a href="https://reddit.com/r/SecureFreelance" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand cursor-pointer transition-colors duration-200 hover:text-brand-hover">
            r/SecureFreelance
          </a>
          {" "}— the first hiring subreddit where every job poster is verified. Unlike other Reddit hiring communities where scams are rampant, our subreddit requires every hiring post to prove the poster is real. It{"'"}s free to join and browse.
        </>
      ),
    },
    {
      id: "c-reddit-post",
      question: "How do I post a hiring gig on the subreddit?",
      answer: "Every [Hiring] post must include one of two things — no exceptions. Tier 1: Create a gig on CheckHire, fund escrow, and include your payment link in the Reddit post. Your post gets a green \"Payment Secured\" flair. Tier 2: Include a video of yourself describing the gig in your Reddit post. No CheckHire account needed for this tier.",
    },
    {
      id: "c-reddit-tiers",
      question: "What are the two posting tiers?",
      answer: "Tier 1 (Escrow-Backed) is the premium path. You fund escrow on CheckHire and include the payment link. Your Reddit post gets a green \"Payment Secured\" flair showing the exact dollar amount locked. Freelancers trust these posts the most because the money is already locked. Tier 2 (Video Post) is the free path. You record a short video of yourself describing the gig and include it in your post. Your post gets a blue \"Video Post\" flair. This deters scammers because they refuse to show their face. No CheckHire account is required.",
    },
    {
      id: "c-reddit-forhire",
      question: "Can I post looking for work on the subreddit?",
      answer: "Yes — [For Hire] posts are open to everyone with no verification required. If you're a freelancer looking for gigs, you can post your skills and rates freely. The verification rules only apply to [Hiring] posts.",
    },
    {
      id: "c-reddit-why",
      question: "Why does the subreddit require escrow or video?",
      answer: "Because every other hiring subreddit on Reddit has a massive scam problem. Volunteer moderators can't keep up. Karma requirements and account age checks are easily bypassed with purchased accounts. Our two-tier system makes scamming structurally impractical — a scammer isn't going to lock real money in escrow or show their face on video just to run a scam. The friction IS the verification.",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900 md:text-3xl">Frequently Asked Questions</h1>
        <p className="mt-2 text-sm text-slate-600">Everything you need to know about using CheckHire</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex w-full gap-1 rounded-full bg-gray-100 p-1">
          <TabsTrigger value="freelancer" className="flex-1 cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-200 data-[state=active]:bg-brand data-[state=active]:text-white data-[state=inactive]:text-slate-600">
            For Freelancers
          </TabsTrigger>
          <TabsTrigger value="client" className="flex-1 cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-200 data-[state=active]:bg-brand data-[state=active]:text-white data-[state=inactive]:text-slate-600">
            For Clients
          </TabsTrigger>
        </TabsList>

        <TabsContent value="freelancer">
          <FAQSection title="Getting Paid" items={freelancerGettingPaid} openId={openId} setOpenId={setOpenId} />
          <FAQSection title="Doing the Work" items={freelancerDoingTheWork} openId={openId} setOpenId={setOpenId} />
          <FAQSection title="Disputes" items={freelancerDisputes} openId={openId} setOpenId={setOpenId} />
        </TabsContent>
        <TabsContent value="client">
          <FAQSection title="Creating & Funding" items={clientCreatingFunding} openId={openId} setOpenId={setOpenId} />
          <FAQSection title="Sharing & Distribution" items={clientSharingDistribution} openId={openId} setOpenId={setOpenId} />
          <FAQSection title="Managing the Gig" items={clientManagingGig} openId={openId} setOpenId={setOpenId} />
          <FAQSection title="Acceptable Use & Compliance" id="acceptable-use" items={clientAcceptableUse} openId={openId} setOpenId={setOpenId} />
          <FAQSection title="Our Reddit Community" items={clientRedditCommunity} openId={openId} setOpenId={setOpenId} />
        </TabsContent>
      </Tabs>

      <div className="mt-8 text-center">
        <p className="text-sm text-slate-600">Still have questions?</p>
        <Link href="/contact" className="mt-1 inline-block cursor-pointer text-sm font-semibold text-brand transition-colors duration-200 hover:text-brand-hover">
          Contact us
        </Link>
      </div>
    </div>
  );
}
