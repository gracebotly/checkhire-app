"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { JobFilters } from "@/components/jobs/JobFilters";

export function MobileFilterSheet() {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();

  // Count active filters for badge
  const activeCount = [
    searchParams.get("jobType"),
    searchParams.get("payType"),
    searchParams.get("remoteType"),
    searchParams.get("tier"),
    searchParams.get("category"),
    searchParams.get("datePosted"),
    searchParams.get("hideCommissionOnly"),
    searchParams.get("salaryMin"),
    searchParams.get("salaryMax"),
  ].filter(Boolean).length;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-colors duration-200 hover:bg-gray-50 lg:hidden">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-gray-200 bg-white px-6 pb-8 pt-4">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold text-slate-900">
              Filters
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="cursor-pointer rounded-lg p-1.5 text-slate-600 transition-colors duration-200 hover:bg-gray-50"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          {/* Reuse the same filter component — it reads/writes URL params */}
          <JobFilters />
          <div className="mt-6">
            <Dialog.Close asChild>
              <button className="w-full cursor-pointer rounded-lg bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover">
                Show Results
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
