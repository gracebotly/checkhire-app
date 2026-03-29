"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow } from "lucide-react";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "highest_tier", label: "Highest Trust" },
  { value: "highest_salary", label: "Highest Salary" },
];

export function JobSort() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("sortBy") || "newest";

  const handleSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") {
      params.delete("sortBy");
    } else {
      params.set("sortBy", value);
    }
    params.delete("page");
    router.push(`/jobs?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-2">
      <ArrowDownWideNarrow className="h-4 w-4 text-slate-600" />
      <div className="flex gap-1">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSort(opt.value)}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
              current === opt.value
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
