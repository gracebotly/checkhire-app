"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatSalary } from "@/lib/formatting";
import type { PayType } from "@/types/database";

interface JobDetailStickyBarProps {
  salaryMin: number | null;
  salaryMax: number | null;
  payType: PayType;
  is100PercentCommission: boolean;
}

export function JobDetailStickyBar({
  salaryMin,
  salaryMax,
  payType,
  is100PercentCommission,
}: JobDetailStickyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar after scrolling past 400px
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  const salary = is100PercentCommission
    ? "Commission only"
    : formatSalary(salaryMin, salaryMax, payType);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-6 py-3 backdrop-blur-sm md:hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tabular-nums text-slate-900">
            {salary}
          </p>
        </div>
        <Link
          href="/signup"
          className="shrink-0 cursor-pointer rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
        >
          Apply
        </Link>
      </div>
    </div>
  );
}
