"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function EmployerError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void _error;
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-7 w-7 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">This page ran into an error</h2>
        <p className="mt-3 text-sm text-slate-600">Something unexpected happened. Try reloading this section.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={() => reset()} className="cursor-pointer rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover">Retry</button>
          <Link href="/employer/dashboard" className="cursor-pointer rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors duration-200 hover:bg-gray-50">Back to dashboard</Link>
        </div>
      </div>
    </div>
  );
}
