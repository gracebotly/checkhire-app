import { User, MapPin, CreditCard, FileText } from "lucide-react";

const items = [
  { icon: User, text: "Your name and date of birth" },
  { icon: MapPin, text: "Your address" },
  { icon: CreditCard, text: "Bank account or debit card for payouts" },
  {
    icon: FileText,
    text: "Tax info (SSN/ITIN for US, local tax ID for international)",
  },
];

export function StripeOnboardingExplainer() {
  return (
    <div className="rounded-xl bg-gray-50 p-6">
      <h3 className="text-base font-semibold text-slate-900">
        What Stripe needs from you
      </h3>

      <div className="mt-4 space-y-3">
        {items.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-start gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
            <span className="text-sm text-slate-600">{text}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-slate-600">
        Stripe uses this for identity verification and tax reporting (1099s for
        US freelancers). Your sensitive information goes directly to Stripe —
        CheckHire never sees your SSN or bank details.
      </p>

      <p className="mt-3 text-sm text-brand">
        Already have Stripe? If you already use Stripe, the process is even
        faster — Stripe can reuse your existing info.
      </p>
    </div>
  );
}
