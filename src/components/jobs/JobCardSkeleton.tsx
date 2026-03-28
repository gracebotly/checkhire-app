import { Skeleton } from "@/components/ui/skeleton";

export function JobCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-1.5 h-5 w-48" />
          </div>
        </div>
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>

      {/* Compensation */}
      <Skeleton className="mt-3 h-5 w-40" />

      {/* Tags */}
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
