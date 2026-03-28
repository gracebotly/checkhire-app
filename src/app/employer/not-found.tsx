import Link from "next/link";

export default function EmployerNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <h2 className="text-xl font-bold text-slate-900">Page not found</h2>
        <p className="mt-3 text-sm text-slate-600">The page you&apos;re looking for doesn&apos;t exist.</p>
        <div className="mt-6">
          <Link href="/employer/dashboard" className="cursor-pointer rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover">Back to dashboard</Link>
        </div>
      </div>
    </div>
  );
}
