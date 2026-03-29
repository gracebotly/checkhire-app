"use client";

import { useEffect, useState } from "react";
import { Loader2, Building2 } from "lucide-react";
import { motion } from "framer-motion";

type EmployerRow = {
  id: string;
  company_name: string;
  tier_level: number;
  transparency_score: number;
  account_status: string;
  country: string;
  is_founding_employer: boolean;
  created_at: string;
};

export default function AdminEmployersPage() {
  const [employers, setEmployers] = useState<EmployerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/employers")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setEmployers(data.employers || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-slate-600" /></div>;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900">Employers</h1>
      <p className="mt-1 text-sm text-slate-600">{employers.length} registered employers</p>

      <div className="mt-6 space-y-2">
        {employers.map((emp, i) => (
          <motion.div
            key={emp.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <Building2 className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{emp.company_name}</p>
                <p className="text-xs text-slate-600">
                  Tier {emp.tier_level} · {emp.country}
                  {emp.is_founding_employer && " · Founding"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold tabular-nums text-slate-900">
                {emp.transparency_score > 0 ? `${emp.transparency_score}/5` : "—"}
              </span>
              <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${
                emp.account_status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                emp.account_status === "restricted" ? "border-amber-200 bg-amber-50 text-amber-700" :
                emp.account_status === "suspended" ? "border-red-200 bg-red-50 text-red-700" :
                "border-gray-200 bg-gray-50 text-slate-600"
              }`}>
                {emp.account_status}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
