import { Zap, Building2 } from "lucide-react";

const platforms = [
  { name: "CheckHire (instant)", speed: "Seconds", barWidth: "3%", highlight: true },
  { name: "CheckHire (standard)", speed: "2 days", barWidth: "10%", highlight: true },
  { name: "Upwork", speed: "7–10 days", barWidth: "65%", highlight: false },
  { name: "Fiverr", speed: "up to 14 days", barWidth: "100%", highlight: false },
];

export function PayoutSpeedComparison() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-4">
        Payout speed comparison
      </p>
      <div className="space-y-3">
        {platforms.map((p) => (
          <div key={p.name}>
            <div className="flex justify-between text-sm">
              <span className={p.highlight ? "font-semibold text-brand" : "text-slate-600"}>
                {p.name}
              </span>
              <span className={`font-mono tabular-nums ${p.highlight ? "text-brand" : "text-slate-600"}`}>
                {p.speed}
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-gray-100">
              <div
                className={`h-2 rounded-full ${p.highlight ? "bg-brand" : "bg-slate-300"}`}
                style={{ width: p.barWidth }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-600">
        Instant payouts available 24/7, including weekends and holidays.
      </p>
    </div>
  );
}
