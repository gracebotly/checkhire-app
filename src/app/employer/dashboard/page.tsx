"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Briefcase,
  Users,
  Clock,
  TrendingUp,
  Plus,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { DaysRemaining } from "@/components/jobs/DaysRemaining";

type DashboardStats = {
  active_listings: number;
  total_listings: number;
  total_applications: number;
  next_expiration: { title: string; slug: string; expires_at: string } | null;
};

type RecentListing = {
  id: string;
  title: string;
  slug: string;
  status: string;
  current_application_count: number;
  max_applications: number;
  created_at: string;
  expires_at: string;
};

export default function EmployerDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentListings, setRecentListings] = useState<RecentListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/employer/dashboard");
        const json = await res.json();
        if (active && json.ok) {
          setStats(json.stats);
          setRecentListings(json.recent_listings || []);
        }
      } catch {
        /* ignore */
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="Dashboard"
          subtitle="Manage your listings and review candidates."
        />
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Active Listings",
      value: stats?.active_listings ?? 0,
      icon: Briefcase,
      color: "text-brand",
      bgColor: "bg-brand-muted",
    },
    {
      label: "Total Applications",
      value: stats?.total_applications ?? 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Total Listings",
      value: stats?.total_listings ?? 0,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Next Expiration",
      value: stats?.next_expiration ? "" : "—",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      custom: stats?.next_expiration ? (
        <div>
          <p className="truncate text-sm font-semibold text-slate-900">
            {stats.next_expiration.title}
          </p>
          <DaysRemaining expiresAt={stats.next_expiration.expires_at} />
        </div>
      ) : null,
    },
  ];

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Dashboard"
        subtitle="Manage your listings and review candidates."
      />

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: index * 0.04,
                  ease: "easeOut",
                }}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}
                  >
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  {stat.custom ? (
                    stat.custom
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-slate-600">
                        {stat.label}
                      </p>
                      <p className="text-xl font-bold tabular-nums text-slate-900">
                        {stat.value}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Recent Listings */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Listings
            </h2>
            <Link
              href="/employer/listings"
              className="cursor-pointer text-sm font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
            >
              View all
            </Link>
          </div>

          {recentListings.length === 0 ? (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-muted">
                <Briefcase className="h-7 w-7 text-brand" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Post your first verified listing
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                Every listing on CheckHire is backed by employer verification.
                Job seekers see your tier badge, salary range, and hiring
                timeline — building trust before they apply.
              </p>
              <Link
                href="/employer/listings/new"
                className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
              >
                <Plus className="h-4 w-4" />
                Create Listing
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {recentListings.map((listing, index) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: index * 0.04,
                    ease: "easeOut",
                  }}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {listing.title}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-600">
                      <span className="tabular-nums">
                        {listing.current_application_count}/
                        {listing.max_applications} apps
                      </span>
                      <DaysRemaining expiresAt={listing.expires_at} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/employer/listings/${listing.id}/applications`}
                      className="cursor-pointer text-xs font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
                    >
                      {listing.current_application_count} apps
                    </Link>
                    <Link
                      href="/employer/listings"
                      className="cursor-pointer text-xs font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
                    >
                      Manage
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
