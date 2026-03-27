import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-gray-900">Authentication Error</h1>
        <p className="mt-2 text-sm text-gray-600">
          We couldn&apos;t complete sign-in. The link may have expired or already been used.
          Please try signing in again.
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            href="/login"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Try Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
