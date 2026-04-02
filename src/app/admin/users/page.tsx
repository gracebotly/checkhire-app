"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldOff,
  ArrowUpDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

// ─── Types ───

type User = {
  id: string;
  display_name: string | null;
  email: string | null;
  trust_badge: string;
  completed_deals_count: number;
  average_rating: number | null;
  is_platform_admin: boolean;
  suspended: boolean;
  stripe_onboarding_complete: boolean;
  created_at: string;
  deals_as_client: number;
  deals_as_freelancer: number;
};

// ─── Constants ───

const filterTabs = [
  { key: "all", label: "All Users" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
  { key: "admins", label: "Admins" },
  { key: "has_deals", label: "Has Deals" },
  { key: "new", label: "New (0 deals)" },
  { key: "stripe_connected", label: "Stripe Connected" },
  { key: "trusted_plus", label: "Trusted+" },
];

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "most_deals", label: "Most deals" },
  { value: "highest_rated", label: "Highest rated" },
  { value: "alphabetical", label: "A → Z" },
];

// ─── Helpers ───

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TrustBadgeLabel({ badge }: { badge: string }) {
  const map: Record<string, { label: string; variant: "default" | "success" | "warning" }> = {
    new: { label: "New", variant: "default" },
    trusted: { label: "Trusted", variant: "success" },
    established: { label: "Established", variant: "success" },
  };
  const b = map[badge] || { label: badge, variant: "default" as const };
  return <Badge variant={b.variant}>{b.label}</Badge>;
}

// ─── Main Page ───

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    action: "suspend" | "unsuspend";
    name: string;
  } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        filter,
        sort,
      });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      toast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [page, filter, sort, search, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSuspend = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${confirmAction.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: confirmAction.action,
          reason: suspendReason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.message || "Action failed", "error");
        return;
      }
      toast(
        confirmAction.action === "suspend"
          ? "User suspended — auth banned + email sent"
          : "User unsuspended — auth restored + email sent",
        "success"
      );
      setConfirmAction(null);
      setSuspendReason("");
      fetchUsers();
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setFilter(t.key);
              setPage(1);
            }}
            className={`cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              filter === t.key
                ? "bg-brand text-white"
                : "bg-white text-slate-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + Sort row */}
      <div className="mb-6 flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            aria-label="Search users"
          />
        </div>
        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] shrink-0">
            <ArrowUpDown className="h-4 w-4 text-slate-600 mr-1.5" />
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="mb-3 text-xs text-slate-600">
        {loading ? "Loading..." : `${total} user${total === 1 ? "" : "s"} found`}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16">
          <Users className="mx-auto h-8 w-8 text-slate-600 mb-3" />
          <p className="text-sm text-slate-600">
            {filter === "suspended"
              ? "No suspended users."
              : filter === "admins"
                ? "No admin users found."
                : "No users found."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.02 }}
            >
              <div className="rounded-xl border border-gray-200 bg-white">
                <button
                  onClick={() =>
                    setExpandedId(expandedId === u.id ? null : u.id)
                  }
                  className="flex w-full cursor-pointer items-center justify-between p-4 text-left"
                  aria-label={`${expandedId === u.id ? "Collapse" : "Expand"} ${u.display_name || u.email}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {u.display_name || "No name"}
                        </p>
                        {u.suspended && (
                          <Badge variant="danger">Suspended</Badge>
                        )}
                        {u.is_platform_admin && (
                          <Badge variant="trusted">Admin</Badge>
                        )}
                        {u.completed_deals_count > 0 && (
                          <TrustBadgeLabel badge={u.trust_badge} />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 truncate">
                        {u.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="hidden sm:flex items-center gap-4 text-xs text-slate-600">
                      <span>{u.completed_deals_count} deals</span>
                      <span>
                        {u.deals_as_client}C / {u.deals_as_freelancer}F
                      </span>
                      <span>
                        {u.average_rating
                          ? `${u.average_rating.toFixed(1)}★`
                          : "No rating"}
                      </span>
                      <span>{formatDate(u.created_at)}</span>
                    </div>
                    {expandedId === u.id ? (
                      <ChevronUp className="h-4 w-4 text-slate-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-600" />
                    )}
                  </div>
                </button>

                {expandedId === u.id && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 text-xs mb-3">
                      <div>
                        <p className="text-slate-600">Trust Badge</p>
                        <p className="font-medium text-slate-900 capitalize">
                          {u.trust_badge}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Completed Deals</p>
                        <p className="font-medium text-slate-900">
                          {u.completed_deals_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Gigs Posted (Client)</p>
                        <p className="font-medium text-slate-900">
                          {u.deals_as_client}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Gigs Worked (Freelancer)</p>
                        <p className="font-medium text-slate-900">
                          {u.deals_as_freelancer}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Rating</p>
                        <p className="font-medium text-slate-900">
                          {u.average_rating?.toFixed(1) || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Stripe</p>
                        <p className="font-medium text-slate-900">
                          {u.stripe_onboarding_complete ? "Connected" : "Not connected"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Joined</p>
                        <p className="font-medium text-slate-900">
                          {formatDate(u.created_at)}
                        </p>
                      </div>
                    </div>
                    {!u.is_platform_admin && (
                      <Button
                        variant={u.suspended ? "outline" : "danger"}
                        size="sm"
                        onClick={() =>
                          setConfirmAction({
                            userId: u.id,
                            action: u.suspended ? "unsuspend" : "suspend",
                            name: u.display_name || u.email || "this user",
                          })
                        }
                      >
                        {u.suspended ? (
                          <>
                            <ShieldOff className="h-4 w-4 mr-1.5" />
                            Unsuspend Account
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-1.5" />
                            Suspend Account
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Confirm Suspend/Unsuspend Dialog */}
      <Dialog
        open={!!confirmAction}
        onOpenChange={() => {
          setConfirmAction(null);
          setSuspendReason("");
        }}
      >
        <DialogContent>
          <DialogHeader
            title={
              confirmAction?.action === "suspend"
                ? "Suspend User"
                : "Unsuspend User"
            }
          />
          <div className="px-6 pb-6 space-y-4">
            <p className="text-sm text-slate-600">
              {confirmAction?.action === "suspend"
                ? `Are you sure you want to suspend ${confirmAction.name}? This will:`
                : `Are you sure you want to unsuspend ${confirmAction?.name}? This will:`}
            </p>

            {confirmAction?.action === "suspend" ? (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800 space-y-1">
                <p>• Ban them from signing in (Supabase Auth level)</p>
                <p>• Block all API actions (create deals, accept gigs, etc.)</p>
                <p>• Send them an email explaining the suspension</p>
                <p>• Pause any active deals they&apos;re involved in</p>
              </div>
            ) : (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-800 space-y-1">
                <p>• Restore their ability to sign in</p>
                <p>• Re-enable all platform actions</p>
                <p>• Send them an email confirming their account is restored</p>
              </div>
            )}

            {confirmAction?.action === "suspend" && (
              <div>
                <label
                  htmlFor="suspend-reason"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Reason (optional — included in the email to the user)
                </label>
                <textarea
                  id="suspend-reason"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g., Multiple reports of non-delivery on funded gigs"
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                />
                <p className="mt-1 text-xs text-slate-600">
                  {suspendReason.length}/500
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 justify-end">
              <DialogClose asChild>
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                variant={
                  confirmAction?.action === "suspend" ? "danger" : "default"
                }
                size="sm"
                onClick={handleSuspend}
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Processing..."
                  : confirmAction?.action === "suspend"
                    ? "Suspend & Notify"
                    : "Unsuspend & Notify"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
