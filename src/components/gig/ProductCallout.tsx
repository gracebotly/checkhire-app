import Link from "next/link";
import { Shield } from "lucide-react";

export function ProductCallout() {
  return (
    <div className="not-prose my-8 rounded-xl border border-gray-200 bg-brand-muted p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-brand" />
            <span className="text-xs font-semibold text-brand uppercase tracking-widest">
              CheckHire
            </span>
          </div>
          <p className="text-base font-semibold text-slate-900">
            Protect any online deal — freelancer keeps 100%.
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Turn any online deal into a protected transaction. Takes 60 seconds.
          </p>
        </div>
        <Link
          href="/login?mode=signup&redirect=/deal/new"
          className="inline-flex cursor-pointer items-center justify-center px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold transition-colors duration-200 hover:bg-brand-hover whitespace-nowrap flex-shrink-0"
        >
          Create Protected Deal
        </Link>
      </div>
    </div>
  );
}
