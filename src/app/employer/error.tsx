"use client";

import Link from "next/link";

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
          <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
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
