"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Search, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

type User = {
  id: string;
  display_name: string | null;
  email: string | null;
  trust_badge: string;
  completed_deals_count: number;
  average_rating: number | null;
  is_platform_admin: boolean;
  suspended: boolean;
  created_at: string;
  deals_as_client: number;
  deals_as_freelancer: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    action: "suspend" | "unsuspend";
    name: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
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
  }, [page, search, toast]);

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
        body: JSON.stringify({ action: confirmAction.action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.message || "Action failed", "error");
        return;
      }
      toast(
        confirmAction.action === "suspend"
          ? "User suspended"
          : "User unsuspended",
        "success"
      );
      setConfirmAction(null);
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
      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          aria-label="Search users"
        />
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
          <Users className="mx-auto h-8 w-8 text-slate-400 mb-3" />
          <p className="text-sm text-slate-600">No users found.</p>
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {u.display_name || "No name"}
                        </p>
                        {u.suspended && (
                          <Badge variant="danger">Suspended</Badge>
                        )}
                        {u.is_platform_admin && (
                          <Badge variant="trusted">Admin</Badge>
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
                      <span>{u.deals_as_client}C / {u.deals_as_freelancer}F</span>
                      <span>
                        {u.average_rating
                          ? `${u.average_rating.toFixed(1)} stars`
                          : "No rating"}
                      </span>
                      <span>{formatDate(u.created_at)}</span>
                    </div>
                    {expandedId === u.id ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {expandedId === u.id && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs mb-3">
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
                        {u.suspended
                          ? "Unsuspend Account"
                          : "Suspend Account"}
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

      {/* Confirm Suspend Dialog */}
      <Dialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
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
                ? `Are you sure you want to suspend ${confirmAction.name}? They will not be able to use the platform.`
                : `Are you sure you want to unsuspend ${confirmAction?.name}?`}
            </p>
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
                    ? "Suspend"
                    : "Unsuspend"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
