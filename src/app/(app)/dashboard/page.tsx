"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Briefcase, Search, ArrowLeftRight, Users, PlusCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GigCard } from "@/components/gig/GigCard";
import { createClient } from "@/lib/supabase/client";
import type { DealWithParticipants } from "@/types/database";

type Mode = "client" | "freelancer" | null;

function ModePicker({ onSelect }: { onSelect: (mode: Mode) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mt-12 flex flex-col items-center text-center"
    >
      <h1 className="font-display text-2xl font-bold text-slate-900">
        What brings you to CheckHire?
      </h1>
      <p className="mt-2 max-w-sm text-sm text-slate-600">
        You can always switch later. This just sets your default view.
      </p>
      <div className="mt-8 grid w-full max-w-sm gap-3">
        <button
          type="button"
          onClick={() => onSelect("client")}
          className="flex cursor-pointer items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 text-left transition-colors duration-200 hover:border-brand hover:bg-brand-muted"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted">
            <Users className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">I&apos;m hiring</p>
            <p className="mt-0.5 text-xs text-slate-600">Post gigs and find freelancers</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onSelect("freelancer")}
          className="flex cursor-pointer items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 text-left transition-colors duration-200 hover:border-brand hover:bg-brand-muted"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted">
            <Briefcase className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">I&apos;m looking for work</p>
            <p className="mt-0.5 text-xs text-slate-600">Browse gigs and apply</p>
          </div>
        </button>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [deals, setDeals] = useState<DealWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [modeLoading, setModeLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [userId, setUserId] = useState("");
  const [mode, setMode] = useState<Mode>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      // Fetch mode
      try {
        const res = await fetch("/api/users/mode");
        const data = await res.json();
        if (data.ok) setMode(data.mode);
      } catch {
        // noop
      } finally {
        setModeLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (modeLoading) return;
    async function fetchDeals() {
      setLoading(true);
      try {
        const roleParam = mode ? `&role=${mode}` : "";
        const res = await fetch(`/api/deals/mine?filter=${filter}${roleParam}`);
        const data = await res.json();
        if (data.ok) setDeals(data.deals);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchDeals();
  }, [filter, mode, modeLoading]);

  const handleSetMode = async (newMode: Mode) => {
    setMode(newMode);
    try {
      await fetch("/api/users/mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });
    } catch {
      // noop
    }
  };

  const handleToggleMode = () => {
    handleSetMode(mode === "freelancer" ? "client" : "freelancer");
  };

  // Show mode picker if not set yet
  if (!modeLoading && mode === null) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <ModePicker onSelect={handleSetMode} />
      </div>
    );
  }

  const isFreelancer = mode === "freelancer";

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
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {isFreelancer ? "My Work" : "My Gigs"}
          </h1>
          <button
            type="button"
            onClick={handleToggleMode}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50 hover:text-slate-900"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {isFreelancer ? "Switch to Hiring" : "Switch to Working"}
          </button>
        </div>

        <div className="mt-2 mb-6">
          <Link
            href={isFreelancer ? "/gigs" : "/deal/new"}
            className="cursor-pointer text-sm font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
          >
            {isFreelancer ? "Browse open gigs →" : "Create a new deal →"}
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
            {loading || modeLoading ? (
              <div className="space-y-3 mt-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : deals.length === 0 ? (
              <div className="mt-12 flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-muted">
                  {isFreelancer ? (
                    <Search className="h-7 w-7 text-brand" />
                  ) : (
                    <PlusCircle className="h-7 w-7 text-brand" />
                  )}
                </div>
                <p className="text-base font-semibold text-slate-900">
                  {isFreelancer ? "No work yet" : "No gigs yet"}
                </p>
                <p className="mt-1 max-w-sm text-sm text-slate-600">
                  {isFreelancer
                    ? "Browse open gigs and apply. Your accepted gigs and active work will appear here."
                    : "Create a protected deal, share the link anywhere, and get paid safely. Your deals will appear here."}
                </p>
                <Link href={isFreelancer ? "/gigs" : "/deal/new"} className="mt-5">
                  <Button size="lg">
                    {isFreelancer ? "Browse Gigs" : "Create Your First Deal"}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
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
