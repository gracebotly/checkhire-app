"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Globe, Building2, Users, MapPin } from "lucide-react";
import { LogoUploader } from "@/components/settings/LogoUploader";

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Marketing",
  "Design",
  "Sales",
  "Engineering",
  "Legal",
  "Consulting",
  "Real Estate",
  "Media",
  "Nonprofit",
  "Government",
  "Retail",
  "Manufacturing",
  "Other",
];

const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5000+",
];

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "AU", label: "Australia" },
  { value: "NL", label: "Netherlands" },
  { value: "SE", label: "Sweden" },
  { value: "CH", label: "Switzerland" },
  { value: "IE", label: "Ireland" },
  { value: "IN", label: "India" },
  { value: "SG", label: "Singapore" },
  { value: "JP", label: "Japan" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "Other", label: "Other" },
];

type EmployerProfile = {
  id: string;
  company_name: string;
  website_domain: string | null;
  description: string | null;
  industry: string | null;
  company_size: string | null;
  country: string;
  logo_url: string | null;
  tier_level: number;
  domain_email_verified_at: string | null;
  created_at: string;
};

export function CompanyProfileTab() {
  const [employer, setEmployer] = useState<EmployerProfile | null>(null);
  const [role, setRole] = useState<string>("poster");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editDomain, setEditDomain] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editSize, setEditSize] = useState("");
  const [editCountry, setEditCountry] = useState("US");

  // ── Load profile ───────────────────────────────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/employer/profile");
        const json = await res.json();
        if (!active) return;
        if (json.ok && json.employer) {
          setEmployer(json.employer);
          setRole(json.role || "poster");
          setEditName(json.employer.company_name || "");
          setEditDomain(json.employer.website_domain || "");
          setEditDescription(json.employer.description || "");
          setEditIndustry(json.employer.industry || "");
          setEditSize(json.employer.company_size || "");
          setEditCountry(json.employer.country || "US");
        }
      } catch {
        // Network error — will show error state
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // ── Save profile ───────────────────────────────────────────
  const handleSave = async () => {
    if (!employer) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const updates: Record<string, string> = {};
    if (editName.trim() !== (employer.company_name || "")) updates.company_name = editName.trim();
    if (editDomain.trim() !== (employer.website_domain || "")) updates.website_domain = editDomain.trim();
    if (editDescription.trim() !== (employer.description || "")) updates.description = editDescription.trim();
    if (editIndustry !== (employer.industry || "")) updates.industry = editIndustry;
    if (editSize !== (employer.company_size || "")) updates.company_size = editSize;
    if (editCountry !== (employer.country || "US")) updates.country = editCountry;

    if (Object.keys(updates).length === 0) {
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/employer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();

      if (json.ok && json.employer) {
        setEmployer(json.employer);
        setEditName(json.employer.company_name || "");
        setEditDomain(json.employer.website_domain || "");
        setEditDescription(json.employer.description || "");
        setEditIndustry(json.employer.industry || "");
        setEditSize(json.employer.company_size || "");
        setEditCountry(json.employer.country || "US");
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        router.refresh();
      } else {
        setSaveError(json.message || json.code || "Save failed.");
      }
    } catch {
      setSaveError("Network error. Please try again.");
    }

    setSaving(false);
  };

  const hasChanges =
    employer &&
    (editName.trim() !== (employer.company_name || "") ||
      editDomain.trim() !== (employer.website_domain || "") ||
      editDescription.trim() !== (employer.description || "") ||
      editIndustry !== (employer.industry || "") ||
      editSize !== (employer.company_size || "") ||
      editCountry !== (employer.country || "US"));

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!employer) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
        Failed to load company profile. Please try refreshing the page.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Company Logo ─── */}
      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-600">
          Company Logo
        </label>
        <LogoUploader
          currentUrl={employer.logo_url}
          onUploaded={(url) => {
            setEmployer({ ...employer, logo_url: url });
            router.refresh();
          }}
          onRemoved={() => {
            setEmployer({ ...employer, logo_url: null });
            router.refresh();
          }}
        />
      </div>

      {/* ── Company Name ─── */}
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-600">
          Company Name
        </label>
        <div className="relative max-w-md">
          <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={editName}
            onChange={(e) => {
              if (e.target.value.length <= 100) setEditName(e.target.value);
            }}
            maxLength={100}
            minLength={2}
            placeholder="Acme Corp"
            disabled={role !== "admin"}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-16 text-sm text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums ${editName.length >= 90 ? "text-amber-600" : "text-slate-600"}`}>
            {editName.length}/100
          </span>
        </div>
        {editName.trim().length > 0 && editName.trim().length < 2 && (
          <p className="mt-1 text-xs text-red-500">Must be at least 2 characters</p>
        )}
        {role !== "admin" && (
          <p className="mt-1 text-xs text-slate-600">Only admins can change the company name.</p>
        )}
      </div>

      {/* ── Website Domain ─── */}
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-600">
          Website Domain
        </label>
        <div className="relative max-w-md">
          <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={editDomain}
            onChange={(e) => setEditDomain(e.target.value)}
            placeholder="acmecorp.com"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Used for domain email verification. Enter without https:// or www.
        </p>
      </div>

      {/* ── Description ─── */}
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-600">
          Company Description
        </label>
        <div className="relative max-w-lg">
          <textarea
            value={editDescription}
            onChange={(e) => {
              if (e.target.value.length <= 2000) setEditDescription(e.target.value);
            }}
            maxLength={2000}
            rows={4}
            placeholder="Tell candidates what your company does, your mission, and why they should work with you..."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <span className={`absolute bottom-2 right-3 text-xs tabular-nums ${editDescription.length >= 1800 ? "text-amber-600" : "text-slate-600"}`}>
            {editDescription.length}/2000
          </span>
        </div>
      </div>

      {/* ── Industry + Size (side by side on desktop) ─── */}
      <div className="grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-600">
            Industry
          </label>
          <select
            value={editIndustry}
            onChange={(e) => setEditIndustry(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="">Select industry</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-600">
            Company Size
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            <select
              value={editSize}
              onChange={(e) => setEditSize(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="">Select size</option>
              {COMPANY_SIZES.map((s) => (
                <option key={s} value={s}>{s} employees</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Country ─── */}
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-600">
          Country
        </label>
        <div className="relative max-w-md">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <select
            value={editCountry}
            onChange={(e) => setEditCountry(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        {editCountry !== "US" && (
          <p className="mt-1 text-xs text-amber-600">
            International employers must use Tier 1 (Payment Verified) once full verification is enabled.
          </p>
        )}
      </div>

      {/* ── Member Since (read-only) ─── */}
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-600">
          Member Since
        </label>
        <p className="text-sm text-slate-600">
          {new Date(employer.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* ── Save button ─── */}
      <div className="flex items-center gap-3 border-t border-gray-100 pt-6">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 ${
            hasChanges && !saving
              ? "bg-brand hover:bg-brand-hover"
              : "cursor-not-allowed bg-gray-300"
          }`}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {saveSuccess && (
          <span className="text-sm font-medium text-emerald-600">Saved!</span>
        )}
        {saveError && (
          <span className="text-sm font-medium text-red-600">{saveError}</span>
        )}
      </div>
    </div>
  );
}
