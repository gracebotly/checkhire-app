"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Briefcase, Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PublicGigCard } from "@/components/gig/PublicGigCard";

type PublicDeal = {
  id: string;
  title: string;
  description: string;
  total_amount: number;
  currency: string;
  deadline: string | null;
  deal_link_slug: string;
  category: string | null;
  escrow_status: string;
  created_at: string;
  client: {
    display_name: string | null;
    avatar_url: string | null;
    trust_badge: string;
    completed_deals_count: number;
    average_rating: number | null;
    profile_slug: string | null;
  };
  interested_count: number;
};

export function BrowseGigsContent() {
  const [deals, setDeals] = useState<PublicDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [category, setCategory] = useState("all");
  const [budget, setBudget] = useState("all");
  const [sort, setSort] = useState("newest");
  const [fundedOnly, setFundedOnly] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [category, budget, sort, fundedOnly]);

  useEffect(() => {
    async function fetchDeals() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category !== "all") params.set("category", category);
        if (budget !== "all") {
          if (budget === "under_100") params.set("max_amount", "10000");
          else if (budget === "100_500") {
            params.set("min_amount", "10000");
            params.set("max_amount", "50000");
          } else if (budget === "500_2000") {
            params.set("min_amount", "50000");
            params.set("max_amount", "200000");
          } else if (budget === "over_2000") {
            params.set("min_amount", "200000");
          }
        }
        if (fundedOnly) params.set("funded_only", "true");
        params.set("sort", sort);
        params.set("page", page.toString());

        const res = await fetch(`/api/deals/public?${params.toString()}`);
        const data = await res.json();
        if (data.ok) {
          if (page === 1) {
            setDeals(data.deals);
          } else {
            setDeals((prev) => [...prev, ...data.deals]);
          }
          setTotal(data.total);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchDeals();
  }, [category, budget, sort, fundedOnly, page]);

  const hasMore = deals.length < total;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Browse Gigs
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Open gigs looking for freelancers. Apply to get started.
        </p>

        {/* Filter bar */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="web_dev">Web & App Dev</SelectItem>
                <SelectItem value="design">Design & Branding</SelectItem>
                <SelectItem value="writing">Writing & Content</SelectItem>
                <SelectItem value="video">Video & Animation</SelectItem>
                <SelectItem value="marketing">Marketing & Social</SelectItem>
                <SelectItem value="virtual_assistant">Virtual Assistant</SelectItem>
                <SelectItem value="audio">Audio & Music</SelectItem>
                <SelectItem value="translation">Translation</SelectItem>
                <SelectItem value="other">Other Digital</SelectItem>
              </SelectContent>
            </Select>

            <Select value={budget} onValueChange={setBudget}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Budget" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Budget</SelectItem>
                <SelectItem value="under_100">Under $100</SelectItem>
                <SelectItem value="100_500">$100 – $500</SelectItem>
                <SelectItem value="500_2000">$500 – $2,000</SelectItem>
                <SelectItem value="over_2000">$2,000+</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="highest_budget">Highest Budget</SelectItem>
                <SelectItem value="deadline_soonest">Deadline Soonest</SelectItem>
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={() => setFundedOnly(!fundedOnly)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                fundedOnly
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-slate-600 hover:bg-gray-50"
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              Payment Secured
            </button>
          </div>
        </div>

        {/* Gig grid */}
        <div className="mt-6">
          {loading && page === 1 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-56 w-full rounded-xl" />
              ))}
            </div>
          ) : deals.length === 0 ? (
            <div className="mt-12 flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-muted">
                <Briefcase className="h-7 w-7 text-brand" />
              </div>
              <p className="text-base font-semibold text-slate-900">
                No open gigs right now
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Check back soon or post your own!
              </p>
              <Link href="/deal/new" className="mt-4">
                <Button>Post a Gig</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {deals.map((deal, i) => (
                  <PublicGigCard key={deal.id} deal={deal} index={i} />
                ))}
              </div>
              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
