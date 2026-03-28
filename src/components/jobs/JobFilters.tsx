"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { TierBadge } from "@/components/jobs/TierBadge";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import type { TierLevel } from "@/types/database";

const JOB_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "gig", label: "Gig" },
  { value: "temp", label: "Temporary" },
];

const PAY_TYPES = [
  { value: "salary", label: "Salary" },
  { value: "hourly", label: "Hourly" },
  { value: "commission", label: "Commission" },
  { value: "project", label: "Project" },
];

const REMOTE_TYPES = [
  { value: "full_remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

const TIERS: { value: string; tier: TierLevel }[] = [
  { value: "1", tier: 1 },
  { value: "2", tier: 2 },
  { value: "3", tier: 3 },
];

const CATEGORIES = [
  "Engineering",
  "Design",
  "Marketing",
  "Sales",
  "Operations",
  "Customer Support",
  "Healthcare",
  "Education",
  "Skilled Trades",
];

const DATE_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
];

export function JobFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read current filter state from URL
  const activeJobTypes = searchParams.get("jobType")?.split(",").filter(Boolean) || [];
  const activePayTypes = searchParams.get("payType")?.split(",").filter(Boolean) || [];
  const activeRemoteTypes = searchParams.get("remoteType")?.split(",").filter(Boolean) || [];
  const activeTiers = searchParams.get("tier")?.split(",").filter(Boolean) || [];
  const activeCategory = searchParams.get("category") || "";
  const activeDatePosted = searchParams.get("datePosted") || "";
  const hideCommissionOnly = searchParams.get("hideCommissionOnly") === "true";
  const salaryMin = searchParams.get("salaryMin") || "";
  const salaryMax = searchParams.get("salaryMax") || "";

  const activeCount = [
    activeJobTypes.length > 0,
    activePayTypes.length > 0,
    activeRemoteTypes.length > 0,
    activeTiers.length > 0,
    !!activeCategory,
    !!activeDatePosted,
    hideCommissionOnly,
    !!salaryMin || !!salaryMax,
  ].filter(Boolean).length;

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/jobs?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const toggleInList = useCallback(
    (key: string, value: string) => {
      const current = searchParams.get(key)?.split(",").filter(Boolean) || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      updateParam(key, next.join(","));
    },
    [searchParams, updateParam]
  );

  const clearAll = useCallback(() => {
    router.push("/jobs", { scroll: false });
  }, [router]);

  return (
    <aside className="w-64 shrink-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="flex cursor-pointer items-center gap-1 text-xs font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
          >
            <RotateCcw className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Job Type */}
      <FilterSection title="Job Type">
        {JOB_TYPES.map((type) => (
          <FilterCheckbox
            key={type.value}
            label={type.label}
            checked={activeJobTypes.includes(type.value)}
            onChange={() => toggleInList("jobType", type.value)}
          />
        ))}
      </FilterSection>

      {/* Salary Range */}
      <FilterSection title="Salary Range">
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={salaryMin}
            onChange={(e) => updateParam("salaryMin", e.target.value)}
            className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <span className="text-xs text-slate-600">to</span>
          <input
            type="number"
            placeholder="Max"
            value={salaryMax}
            onChange={(e) => updateParam("salaryMax", e.target.value)}
            className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </FilterSection>

      {/* Pay Type */}
      <FilterSection title="Pay Type">
        {PAY_TYPES.map((type) => (
          <FilterCheckbox
            key={type.value}
            label={type.label}
            checked={activePayTypes.includes(type.value)}
            onChange={() => toggleInList("payType", type.value)}
          />
        ))}
        <div className="mt-2 border-t border-gray-100 pt-2">
          <FilterCheckbox
            label="Hide 100% commission"
            checked={hideCommissionOnly}
            onChange={() =>
              updateParam("hideCommissionOnly", hideCommissionOnly ? "" : "true")
            }
          />
        </div>
      </FilterSection>

      {/* Remote Type */}
      <FilterSection title="Work Style">
        {REMOTE_TYPES.map((type) => (
          <FilterCheckbox
            key={type.value}
            label={type.label}
            checked={activeRemoteTypes.includes(type.value)}
            onChange={() => toggleInList("remoteType", type.value)}
          />
        ))}
      </FilterSection>

      {/* Verification Tier */}
      <FilterSection title="Verification Tier">
        {TIERS.map((t) => (
          <label
            key={t.value}
            className="flex cursor-pointer items-center gap-2"
          >
            <Checkbox
              checked={activeTiers.includes(t.value)}
              onCheckedChange={() => toggleInList("tier", t.value)}
            />
            <TierBadge tier={t.tier} size="sm" />
          </label>
        ))}
      </FilterSection>

      {/* Category */}
      <FilterSection title="Category">
        <select
          value={activeCategory}
          onChange={(e) => updateParam("category", e.target.value)}
          className="h-8 w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-xs text-slate-900 transition-colors duration-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </FilterSection>

      {/* Date Posted */}
      <FilterSection title="Date Posted">
        {DATE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center gap-2"
          >
            <input
              type="radio"
              name="datePosted"
              checked={activeDatePosted === opt.value}
              onChange={() => updateParam("datePosted", opt.value)}
              className="h-3.5 w-3.5 cursor-pointer accent-brand"
            />
            <span className="text-xs text-slate-900">{opt.label}</span>
          </label>
        ))}
      </FilterSection>
    </aside>
  );
}

/* ─── Helper sub-components ─── */

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FilterCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span className="text-xs text-slate-900">{label}</span>
    </label>
  );
}
