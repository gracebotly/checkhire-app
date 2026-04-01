"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GigCard } from "@/components/gig/GigCard";
import { createClient } from "@/lib/supabase/client";
import type { DealWithParticipants } from "@/types/database";

export default function DashboardPage() {
  const [deals, setDeals] = useState<DealWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    }
    init();
  }, []);

  useEffect(() => {
    async function fetchDeals() {
      setLoading(true);
      try {
        const res = await fetch(`/api/deals/mine?filter=${filter}`);
        const data = await res.json();
        if (data.ok) setDeals(data.deals);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchDeals();
  }, [filter]);

  const counts = {
    active: deals.filter(
      (d) => !["completed", "cancelled", "refunded"].includes(d.status)
    ).length,
    completed: deals.filter((d) => d.status === "completed").length,
    all: deals.length,
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <h1 className="font-display text-2xl font-bold text-slate-900">
          My Gigs
        </h1>
        <div className="mt-2 mb-6">
          <Link
            href="/gigs"
            className="cursor-pointer text-sm font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
          >
            Browse open gigs →
          </Link>
        </div>

        <Tabs
          value={filter}
          onValueChange={setFilter}
          className="mt-6"
        >
          <TabsList>
            <TabsTrigger value="active">
              Active {!loading && `(${counts.active})`}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed {!loading && `(${counts.completed})`}
            </TabsTrigger>
            <TabsTrigger value="all">
              All {!loading && `(${counts.all})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter}>
            {loading ? (
              <div className="space-y-4 mt-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            ) : deals.length === 0 ? (
              <div className="mt-12 flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-muted">
                  <Briefcase className="h-7 w-7 text-brand" />
                </div>
                <p className="text-base font-semibold text-slate-900">
                  Welcome to CheckHire
                </p>
                <p className="mt-1 max-w-sm text-sm text-slate-600">
                  Create a payment link, share it anywhere, and get paid safely
                  with escrow protection. Your gigs will appear here.
                </p>
                <Link href="/deal/new" className="mt-5">
                  <Button size="lg">Create Your First Payment Link</Button>
                </Link>
                <Link
                  href="/how-it-works"
                  className="mt-3 cursor-pointer text-sm font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
                >
                  Learn how it works →
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {deals.map((deal, i) => (
                  <GigCard
                    key={deal.id}
                    deal={deal}
                    index={i}
                    currentUserId={userId}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
