import type { CancellationRequest, Deal } from "@/types/database";

export const CANCELLATION_ALLOWED_DEAL_STATUSES = [
  "pending_acceptance",
  "funded",
  "in_progress",
  "revision_requested",
  "submitted",
] as const;

export const CANCELLATION_HARD_CAP = 3;

export type CancellationUiState =
  | { kind: "hidden" }
  | { kind: "request_blocked_dispute" }
  | { kind: "request_blocked_cap" }
  | { kind: "pending_for_responder"; pendingRequest: CancellationRequest }
  | { kind: "pending_for_requester"; pendingRequest: CancellationRequest }
  | { kind: "available" };

export function getCancellationUiState(params: {
  deal: Pick<Deal, "status">;
  cancellationRequests: CancellationRequest[];
  currentUserId: string | null;
  role: "client" | "freelancer" | "visitor";
}): CancellationUiState {
  const { deal, cancellationRequests, currentUserId, role } = params;

  if (role === "visitor" || !currentUserId) {
    return { kind: "hidden" };
  }

  if (deal.status === "disputed") {
    return { kind: "request_blocked_dispute" };
  }

  if (
    !CANCELLATION_ALLOWED_DEAL_STATUSES.includes(
      deal.status as (typeof CANCELLATION_ALLOWED_DEAL_STATUSES)[number]
    )
  ) {
    return { kind: "hidden" };
  }

  const pending = cancellationRequests.find((r) => r.status === "pending");
  if (pending) {
    if (pending.requested_by === currentUserId) {
      return { kind: "pending_for_requester", pendingRequest: pending };
    }
    return { kind: "pending_for_responder", pendingRequest: pending };
  }

  if (cancellationRequests.length >= CANCELLATION_HARD_CAP) {
    return { kind: "request_blocked_cap" };
  }

  return { kind: "available" };
}
