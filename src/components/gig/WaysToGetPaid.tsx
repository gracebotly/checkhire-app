import { Building2, Zap } from "lucide-react";

export function WaysToGetPaid() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Standard */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted">
            <Building2 className="h-5 w-5 text-brand" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            Standard (Free)
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            2 business days to your bank account
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Works with any US bank, plus Revolut, Wise, N26, and banks in 46+
            countries
          </p>
          <p className="mt-2 font-semibold text-green-600">$0 fee</p>
        </div>

        {/* Instant */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted">
            <Zap className="h-5 w-5 text-brand" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Instant</h3>
          <p className="mt-1 text-sm text-slate-600">
            Under 30 minutes to your debit card
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Available 24/7 including weekends and holidays
          </p>
          <p className="mt-2 text-slate-600">$1 or 1% fee</p>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-slate-600">
        Your money goes directly to your bank through Stripe. CheckHire never
        sees your bank details.
      </p>
    </div>
  );
}
