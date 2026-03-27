import Link from "next/link";

export default function EmployerNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <h2 className="text-xl font-bold text-gray-900">Page not found</h2>
        <p className="mt-3 text-sm text-gray-500">The page you&apos;re looking for doesn&apos;t exist.</p>
        <div className="mt-6">
          <Link href="/employer/dashboard" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">Back to dashboard</Link>
        </div>
      </div>
    </div>
  );
}
