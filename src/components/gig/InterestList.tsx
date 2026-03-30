"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import { TrustBadge } from "@/components/gig/TrustBadge";
import { StarRating } from "@/components/gig/StarRating";
import type { DealInterestWithUser, TrustBadge as TrustBadgeType } from "@/types/database";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type Props = {
  dealId: string;
  interests: DealInterestWithUser[];
};

export function InterestList({ dealId, interests }: Props) {
  const router = useRouter();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    interestId: string;
    name: string;
  }>({ open: false, interestId: "", name: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const pendingInterests = interests.filter((i) => i.status === "pending");
  const otherInterests = interests.filter((i) => i.status !== "pending");

  const handleSelect = async (interestId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/interest/${interestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setConfirmDialog({ open: false, interestId: "", name: "" });
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (interestId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/interest/${interestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (interests.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
        <p className="text-sm text-slate-600">
          No one has expressed interest yet. Share the gig link to attract freelancers!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">
        Interested ({pendingInterests.length} pending)
      </h3>

      {pendingInterests.map((interest) => (
        <div
          key={interest.id}
          className="rounded-xl border border-gray-200 bg-white p-4"
        >
          <div className="flex items-center gap-3">
            {interest.user.avatar_url ? (
              <img
                src={interest.user.avatar_url}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-muted text-sm font-semibold text-brand">
                {getInitials(interest.user.display_name)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {interest.user.profile_slug ? (
                  <a
                    href={`/u/${interest.user.profile_slug}`}
                    className="cursor-pointer text-sm font-semibold text-slate-900 transition-colors duration-200 hover:text-brand"
                  >
                    {interest.user.display_name || "Unknown"}
                  </a>
                ) : (
                  <span className="text-sm font-semibold text-slate-900">
                    {interest.user.display_name || "Unknown"}
                  </span>
                )}
                <TrustBadge
                  badge={interest.user.trust_badge as TrustBadgeType}
                  size="sm"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>{interest.user.completed_deals_count} gigs completed</span>
                {interest.user.average_rating && (
                  <>
                    <span>·</span>
                    <StarRating
                      rating={Number(interest.user.average_rating)}
                      size="sm"
                    />
                    <span>{Number(interest.user.average_rating).toFixed(1)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-600">{interest.pitch_text}</p>

          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              onClick={() =>
                setConfirmDialog({
                  open: true,
                  interestId: interest.id,
                  name: interest.user.display_name || "this freelancer",
                })
              }
              disabled={actionLoading}
            >
              Select
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDecline(interest.id)}
              disabled={actionLoading}
            >
              Decline
            </Button>
          </div>
        </div>
      ))}

      {/* Show accepted/rejected entries */}
      {otherInterests.length > 0 && (
        <div className="space-y-2">
          {otherInterests.map((interest) => (
            <div
              key={interest.id}
              className="rounded-xl border border-gray-200 bg-white p-4 opacity-60"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  {interest.user.display_name || "Unknown"}
                </span>
                <Badge
                  variant={
                    interest.status === "accepted" ? "success" : "default"
                  }
                >
                  {interest.status === "accepted"
                    ? "Selected"
                    : "Declined"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm select dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader
            title="Select Freelancer"
            description={`Select ${confirmDialog.name} for this gig? All other interested freelancers will be notified that the gig has been filled.`}
          />
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => handleSelect(confirmDialog.interestId)}
              disabled={actionLoading}
            >
              {actionLoading ? "Selecting..." : "Confirm Selection"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
