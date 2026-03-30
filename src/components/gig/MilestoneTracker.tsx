"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import { CountdownTimer } from "@/components/gig/CountdownTimer";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Milestone, MilestoneStatus } from "@/types/database";

type Props = {
  milestones: Milestone[];
  dealId: string;
  role: "client" | "freelancer" | "visitor";
  onAction: () => void;
};

const statusColors: Record<MilestoneStatus, string> = {
  pending_funding: "bg-gray-200",
  funded: "bg-brand",
  in_progress: "bg-blue-500",
  submitted: "bg-amber-500",
  revision_requested: "bg-amber-500",
  approved: "bg-green-500",
  released: "bg-green-500",
  disputed: "bg-red-500",
};

const statusLabels: Record<MilestoneStatus, string> = {
  pending_funding: "Pending",
  funded: "Funded",
  in_progress: "In Progress",
  submitted: "Submitted",
  revision_requested: "Revision",
  approved: "Approved",
  released: "Released",
  disputed: "Disputed",
};

const statusVariants: Record<
  MilestoneStatus,
  "default" | "success" | "warning" | "danger" | "outline"
> = {
  pending_funding: "outline",
  funded: "success",
  in_progress: "default",
  submitted: "warning",
  revision_requested: "warning",
  approved: "success",
  released: "success",
  disputed: "danger",
};

export function MilestoneTracker({ milestones, dealId, role, onAction }: Props) {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<string | null>(null);
  const [submitDialog, setSubmitDialog] = useState<string | null>(null);
  const [revisionDialog, setRevisionDialog] = useState<string | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");

  const unfundedMs = milestones.filter((m) => m.status === "pending_funding");
  const unfundedTotal = unfundedMs.reduce((s, m) => s + m.amount, 0);

  const handleFundMilestone = async (milestoneId: string) => {
    setLoadingAction(`fund-${milestoneId}`);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: dealId, milestone_id: milestoneId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      window.location.href = data.url;
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to start checkout", "error");
      setLoadingAction(null);
    }
  };

  const handleFundAll = async () => {
    setLoadingAction("fund-all");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: dealId, fund_all: true }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      window.location.href = data.url;
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to start checkout", "error");
      setLoadingAction(null);
    }
  };

  const handleSubmit = async (milestoneId: string) => {
    setLoadingAction(`submit-${milestoneId}`);
    try {
      const res = await fetch(`/api/deals/${dealId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone_id: milestoneId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast("Work submitted! The client has 72 hours to review.", "success");
      setSubmitDialog(null);
      onAction();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to submit", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConfirm = async (milestoneId: string) => {
    setLoadingAction(`confirm-${milestoneId}`);
    try {
      const res = await fetch(`/api/deals/${dealId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone_id: milestoneId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast("Payment released!", "success");
      setConfirmDialog(null);
      onAction();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to confirm", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRevision = async (milestoneId: string) => {
    if (!revisionNotes.trim()) return;
    setLoadingAction(`revision-${milestoneId}`);
    try {
      const res = await fetch(`/api/deals/${dealId}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: revisionNotes.trim(), milestone_id: milestoneId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast("Revision requested", "info");
      setRevisionNotes("");
      setRevisionDialog(null);
      onAction();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to request revision", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-0">
      {/* Fund All button */}
      {role === "client" && unfundedMs.length > 1 && (
        <div className="mb-3">
          <Button
            onClick={handleFundAll}
            disabled={loadingAction === "fund-all"}
            size="sm"
          >
            {loadingAction === "fund-all"
              ? "Redirecting..."
              : `Fund All Milestones — $${(unfundedTotal / 100).toFixed(2)}`}
          </Button>
          <p className="mt-1 text-xs text-slate-600">
            Includes 5% platform fee ($
            {(Math.round(unfundedTotal * 0.05) / 100).toFixed(2)})
          </p>
        </div>
      )}

      {milestones.map((m, i) => (
        <div key={m.id}>
          <button
            type="button"
            onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
            className="flex w-full cursor-pointer items-start gap-3 py-3 text-left transition-colors duration-200 hover:bg-gray-50/50 rounded-lg px-2 -mx-2"
          >
            {/* Stepper circle + line */}
            <div className="relative flex flex-col items-center">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white",
                  statusColors[m.status]
                )}
              >
                {i + 1}
              </div>
              {i < milestones.length - 1 && (
                <div className="mt-1 h-6 w-0.5 bg-gray-200" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 truncate">
                  {m.title}
                </span>
                <Badge variant={statusVariants[m.status]}>
                  {statusLabels[m.status]}
                </Badge>
              </div>
              <span className="font-mono text-xs tabular-nums text-slate-600">
                ${(m.amount / 100).toFixed(2)}
              </span>
            </div>
          </button>

          {/* Expanded section */}
          {expandedId === m.id && (
            <div className="ml-10 mb-2 space-y-3">
              {m.description && (
                <div className="rounded-lg bg-gray-50 p-3 text-sm text-slate-600">
                  {m.description}
                </div>
              )}

              {/* Countdown for submitted milestones */}
              {m.status === "submitted" &&
                m.auto_release_at &&
                new Date(m.auto_release_at) > new Date() && (
                  <CountdownTimer
                    autoReleaseAt={m.auto_release_at}
                    role={role === "client" ? "client" : "freelancer"}
                    onExpired={onAction}
                  />
                )}

              {/* Client actions */}
              {role === "client" && m.status === "pending_funding" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFundMilestone(m.id)}
                  disabled={loadingAction === `fund-${m.id}`}
                >
                  {loadingAction === `fund-${m.id}`
                    ? "Redirecting..."
                    : `Fund — $${(m.amount / 100).toFixed(2)}`}
                </Button>
              )}

              {role === "client" && m.status === "submitted" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => setConfirmDialog(m.id)}
                    disabled={!!loadingAction}
                  >
                    Approve & Release ${(m.amount / 100).toFixed(2)}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRevisionNotes("");
                      setRevisionDialog(m.id);
                    }}
                    disabled={!!loadingAction || m.revision_count >= 3}
                    title={
                      m.revision_count >= 3
                        ? "Maximum revisions reached"
                        : undefined
                    }
                  >
                    Request Revision ({m.revision_count}/3)
                  </Button>
                </div>
              )}

              {/* Freelancer actions */}
              {role === "freelancer" &&
                ["funded", "in_progress", "revision_requested"].includes(
                  m.status
                ) && (
                  <Button
                    size="sm"
                    onClick={() => setSubmitDialog(m.id)}
                    disabled={!!loadingAction}
                  >
                    Submit for Review
                  </Button>
                )}

              {role === "freelancer" && m.status === "released" && (
                <p className="text-sm font-semibold text-green-600">
                  Released — ${(m.amount / 100).toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* Confirm Dialog */}
          <Dialog
            open={confirmDialog === m.id}
            onOpenChange={(open) => !open && setConfirmDialog(null)}
          >
            <DialogContent>
              <DialogHeader
                title="Approve & Release"
                description={`Release $${(m.amount / 100).toFixed(2)} to the freelancer for "${m.title}"? This cannot be undone.`}
              />
              <div className="flex justify-end gap-2 mt-4">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={() => handleConfirm(m.id)}
                  disabled={loadingAction === `confirm-${m.id}`}
                >
                  {loadingAction === `confirm-${m.id}`
                    ? "Releasing..."
                    : `Release $${(m.amount / 100).toFixed(2)}`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Submit Dialog */}
          <Dialog
            open={submitDialog === m.id}
            onOpenChange={(open) => !open && setSubmitDialog(null)}
          >
            <DialogContent>
              <DialogHeader
                title="Submit Work for Review"
                description={`Submit "${m.title}" for the client to review. They'll have 72 hours to respond.`}
              />
              <div className="flex justify-end gap-2 mt-4">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={() => handleSubmit(m.id)}
                  disabled={loadingAction === `submit-${m.id}`}
                >
                  {loadingAction === `submit-${m.id}`
                    ? "Submitting..."
                    : "Submit Work"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Revision Dialog */}
          <Dialog
            open={revisionDialog === m.id}
            onOpenChange={(open) => !open && setRevisionDialog(null)}
          >
            <DialogContent>
              <DialogHeader
                title="Request Revision"
                description={`Revision ${m.revision_count + 1} of 3 for "${m.title}". The countdown will pause.`}
              />
              <textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Describe what needs to change..."
                maxLength={1000}
                rows={4}
                className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-brand resize-none"
              />
              <div className="flex justify-end gap-2 mt-4">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={() => handleRevision(m.id)}
                  disabled={
                    loadingAction === `revision-${m.id}` ||
                    !revisionNotes.trim()
                  }
                >
                  {loadingAction === `revision-${m.id}`
                    ? "Requesting..."
                    : "Request Revision"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ))}
    </div>
  );
}
