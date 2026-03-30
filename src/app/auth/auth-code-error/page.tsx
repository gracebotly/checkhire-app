import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="font-display text-xl font-bold text-slate-900">
          Authentication Error
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          We couldn&apos;t complete sign-in. The link may have expired or
          already been used. Please try signing in again.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/login"
            className="cursor-pointer rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
          >
            Sign In
          </Link>
          <Link
            href="/login?mode=signup"
            className="cursor-pointer rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors duration-200 hover:bg-gray-50"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
