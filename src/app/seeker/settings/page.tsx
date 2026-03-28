import { PageHeader } from "@/components/layout/page-header";

export default function SeekerSettingsPage() {
  return (
    <div className="min-h-screen">
      <PageHeader title="Settings" subtitle="Account settings and preferences." />
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
          <p className="text-sm text-slate-600">Account settings are coming soon.</p>
        </div>
      </div>
    </div>
  );
}
