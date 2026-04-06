import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildStripeEvent,
  buildCheckoutSession,
  createMockSupabase,
  findUpdate,
  findInsert,
} from "./helpers/stripe-webhook";

/**
 * Stripe Webhook Integration Tests
 *
 * These tests verify that when Stripe webhook events are processed,
 * the correct database state changes happen. They mock Supabase
 * and test the business logic — not the HTTP layer or Stripe
 * signature verification.
 *
 * What these tests catch:
 * - Escrow not being marked as funded after payment
 * - Deal status not transitioning correctly
 * - Activity log entries not being created
 * - Refunds not updating deal status
 * - Milestone funding logic errors
 * - Double-funding protection not working
 */

// ─── Mock modules ───

// Mock Stripe client
vi.mock("@/lib/stripe/client", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: (_body: string, _sig: string, _secret: string) => {
        // Return the parsed event — signature verification is skipped in tests
        return JSON.parse(_body);
      },
    },
    charges: {
      retrieve: async (chargeId: string) => ({
        id: chargeId,
        payment_intent: "pi_test_existing",
      }),
    },
  }),
  stripe: {},
}));

// Mock email — we don't want real emails in tests
vi.mock("@/lib/email/logNotification", () => ({
  sendAndLogNotification: vi.fn().mockResolvedValue(undefined),
}));

// Mock Slack — we don't want real Slack messages in tests
vi.mock("@/lib/slack/notify", () => ({
  notifyAdmin: vi.fn().mockResolvedValue(undefined),
}));

// We need to capture what the webhook handler does to the database
// Since the handler creates its own service client, we mock that module
let mockSupabase: ReturnType<typeof createMockSupabase>;

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => mockSupabase.client,
}));

// ─── Tests ───

describe("Stripe Webhook: checkout.session.completed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks a simple deal as funded when checkout completes", async () => {
    const dealId = "deal-001";

    mockSupabase = createMockSupabase({
      deals: [
        {
          id: dealId,
          title: "Logo Design",
          deal_link_slug: "test-slug",
          client_user_id: "client-001",
          freelancer_user_id: "freelancer-001",
          guest_freelancer_email: null,
          total_amount: 30000,
          escrow_status: "unfunded",
          status: "pending_acceptance",
          funded_at: null,
          has_milestones: false,
          stripe_payment_intent_id: null,
        },
      ],
      user_profiles: [
        { id: "client-001", email: "client@test.com", is_platform_admin: false },
        { id: "freelancer-001", email: "freelancer@test.com", is_platform_admin: false },
      ],
    });

    // Dynamically import the handler AFTER mocks are set up
    const { POST } = await import("@/app/api/stripe/webhooks/route");

    const session = buildCheckoutSession({
      deal_id: dealId,
      escrow_amount: 30000,
      payment_intent: "pi_test_001",
    });

    const event = buildStripeEvent("checkout.session.completed", session);

    const req = new Request("http://localhost/api/stripe/webhooks", {
      method: "POST",
      headers: {
        "stripe-signature": "test_sig",
        "content-type": "application/json",
      },
      body: JSON.stringify(event),
    });

    // Set env vars for the handler
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.received).toBe(true);

    // Verify: deal was updated to funded
    const fundedUpdate = findUpdate(mockSupabase.updates, "deals", {
      escrow_status: "funded",
    });
    expect(fundedUpdate).toBeDefined();
    expect(fundedUpdate!.data.stripe_payment_intent_id).toBe("pi_test_001");
    expect(fundedUpdate!.data.status).toBe("in_progress");

    // Verify: activity log was created
    const activityInsert = findInsert(mockSupabase.inserts, "deal_activity_log", {
      deal_id: dealId,
      entry_type: "system",
    });
    expect(activityInsert).toBeDefined();
    expect(activityInsert!.data.content).toContain("Escrow funded");
    expect(activityInsert!.data.content).toContain("$300.00");
  });

  it("does NOT double-fund an already funded deal", async () => {
    const dealId = "deal-002";

    mockSupabase = createMockSupabase({
      deals: [
        {
          id: dealId,
          title: "Already Funded",
          deal_link_slug: "funded-slug",
          client_user_id: "client-001",
          freelancer_user_id: null,
          guest_freelancer_email: null,
          total_amount: 50000,
          escrow_status: "funded",
          status: "in_progress",
          funded_at: "2026-01-01T00:00:00Z",
          has_milestones: false,
          stripe_payment_intent_id: "pi_existing",
        },
      ],
      user_profiles: [
        { id: "client-001", email: "client@test.com", is_platform_admin: false },
      ],
    });

    const { POST } = await import("@/app/api/stripe/webhooks/route");

    const session = buildCheckoutSession({
      deal_id: dealId,
      escrow_amount: 50000,
    });

    const event = buildStripeEvent("checkout.session.completed", session);

    const req = new Request("http://localhost/api/stripe/webhooks", {
      method: "POST",
      headers: { "stripe-signature": "test_sig" },
      body: JSON.stringify(event),
    });

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const res = await POST(req);
    expect(res.status).toBe(200);

    const fundedUpdate = findUpdate(mockSupabase.updates, "deals", {
      escrow_status: "funded",
    });
    expect(fundedUpdate).toBeUndefined();
  });

  it("skips processing when deal_id is missing from metadata", async () => {
    mockSupabase = createMockSupabase({
      deals: [],
      user_profiles: [],
    });

    const { POST } = await import("@/app/api/stripe/webhooks/route");

    const session = buildCheckoutSession({
      deal_id: "",
      escrow_amount: 10000,
    });
    delete (session.metadata as Record<string, unknown>).deal_id;

    const event = buildStripeEvent("checkout.session.completed", session);

    const req = new Request("http://localhost/api/stripe/webhooks", {
      method: "POST",
      headers: { "stripe-signature": "test_sig" },
      body: JSON.stringify(event),
    });

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockSupabase.updates.length).toBe(0);
    expect(mockSupabase.inserts.length).toBe(0);
  });

  it("funds all milestones when milestone_id is 'all'", async () => {
    const dealId = "deal-003";

    mockSupabase = createMockSupabase({
      deals: [
        {
          id: dealId,
          title: "Multi-Milestone Gig",
          deal_link_slug: "ms-slug",
          client_user_id: "client-001",
          freelancer_user_id: "freelancer-001",
          guest_freelancer_email: null,
          total_amount: 60000,
          escrow_status: "unfunded",
          status: "pending_acceptance",
          funded_at: null,
          has_milestones: true,
          stripe_payment_intent_id: null,
        },
      ],
      user_profiles: [
        { id: "client-001", email: "client@test.com", is_platform_admin: false },
        { id: "freelancer-001", email: "freelancer@test.com", is_platform_admin: false },
      ],
    });

    const { POST } = await import("@/app/api/stripe/webhooks/route");

    const session = buildCheckoutSession({
      deal_id: dealId,
      milestone_id: "all",
      escrow_amount: 60000,
      payment_intent: "pi_test_ms_all",
    });

    const event = buildStripeEvent("checkout.session.completed", session);

    const req = new Request("http://localhost/api/stripe/webhooks", {
      method: "POST",
      headers: { "stripe-signature": "test_sig" },
      body: JSON.stringify(event),
    });

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const res = await POST(req);
    expect(res.status).toBe(200);

    const msUpdate = findUpdate(mockSupabase.updates, "milestones", {
      status: "funded",
    });
    expect(msUpdate).toBeDefined();

    const dealUpdate = findUpdate(mockSupabase.updates, "deals", {
      escrow_status: "funded",
    });
    expect(dealUpdate).toBeDefined();

    const activityInsert = findInsert(mockSupabase.inserts, "deal_activity_log", {
      deal_id: dealId,
    });
    expect(activityInsert).toBeDefined();
    expect(activityInsert!.data.content).toContain("All milestones funded");
  });
});

describe("Stripe Webhook: checkout.session.expired", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs activity when checkout session expires", async () => {
    const dealId = "deal-004";

    mockSupabase = createMockSupabase({
      deals: [
        {
          id: dealId,
          title: "Expired Deal",
          deal_link_slug: "expired-slug",
          client_user_id: "client-001",
          freelancer_user_id: null,
          guest_freelancer_email: null,
        },
      ],
      user_profiles: [
        { id: "client-001", email: "client@test.com", is_platform_admin: false },
      ],
    });

    const { POST } = await import("@/app/api/stripe/webhooks/route");

    const session = { id: "cs_expired", metadata: { deal_id: dealId } };
    const event = buildStripeEvent("checkout.session.expired", session);

    const req = new Request("http://localhost/api/stripe/webhooks", {
      method: "POST",
      headers: { "stripe-signature": "test_sig" },
      body: JSON.stringify(event),
    });

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const res = await POST(req);
    expect(res.status).toBe(200);

    const activityInsert = findInsert(mockSupabase.inserts, "deal_activity_log", {
      deal_id: dealId,
      entry_type: "system",
    });
    expect(activityInsert).toBeDefined();
    expect(activityInsert!.data.content).toContain("expired");
  });
});

describe("Stripe Webhook: charge.refunded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks deal as refunded when charge is refunded", async () => {
    const dealId = "deal-005";

    mockSupabase = createMockSupabase({
      deals: [
        {
          id: dealId,
          title: "Refund Test",
          deal_link_slug: "refund-slug",
          client_user_id: "client-001",
          freelancer_user_id: null,
          guest_freelancer_email: null,
          escrow_status: "funded",
          status: "pending_acceptance",
          stripe_payment_intent_id: "pi_refund_test",
        },
      ],
      user_profiles: [],
    });

    const { POST } = await import("@/app/api/stripe/webhooks/route");

    const charge = {
      id: "ch_test",
      payment_intent: "pi_refund_test",
    };
    const event = buildStripeEvent("charge.refunded", charge);

    const req = new Request("http://localhost/api/stripe/webhooks", {
      method: "POST",
      headers: { "stripe-signature": "test_sig" },
      body: JSON.stringify(event),
    });

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const res = await POST(req);
    expect(res.status).toBe(200);

    const refundUpdate = findUpdate(mockSupabase.updates, "deals", {
      escrow_status: "refunded",
      status: "refunded",
    });
    expect(refundUpdate).toBeDefined();

    const activityInsert = findInsert(mockSupabase.inserts, "deal_activity_log", {
      deal_id: dealId,
      entry_type: "system",
    });
    expect(activityInsert).toBeDefined();
    expect(activityInsert!.data.content).toContain("Refund");
  });
});

describe("Stripe Webhook: async_payment_failed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reverts escrow when bank transfer fails", async () => {
    const dealId = "deal-006";

    mockSupabase = createMockSupabase({
      deals: [
        {
          id: dealId,
          title: "Bank Transfer Fail",
          deal_link_slug: "ach-fail",
          client_user_id: "client-001",
          freelancer_user_id: null,
          guest_freelancer_email: null,
          escrow_status: "funded",
          status: "in_progress",
          stripe_payment_intent_id: "pi_ach",
        },
      ],
      user_profiles: [
        { id: "client-001", email: "client@test.com", is_platform_admin: false },
      ],
    });

    const { POST } = await import("@/app/api/stripe/webhooks/route");

    const session = { id: "cs_ach_fail", metadata: { deal_id: dealId } };
    const event = buildStripeEvent("checkout.session.async_payment_failed", session);

    const req = new Request("http://localhost/api/stripe/webhooks", {
      method: "POST",
      headers: { "stripe-signature": "test_sig" },
      body: JSON.stringify(event),
    });

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const res = await POST(req);
    expect(res.status).toBe(200);

    const revertUpdate = findUpdate(mockSupabase.updates, "deals", {
      escrow_status: "unfunded",
      status: "pending_acceptance",
    });
    expect(revertUpdate).toBeDefined();

    const activityInsert = findInsert(mockSupabase.inserts, "deal_activity_log", {
      deal_id: dealId,
    });
    expect(activityInsert).toBeDefined();
    expect(activityInsert!.data.content).toContain("Bank transfer failed");
  });
});

describe("Stripe Webhook: always returns 200", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 for unknown event types", async () => {
    mockSupabase = createMockSupabase({
      deals: [],
      user_profiles: [],
    });

    const { POST } = await import("@/app/api/stripe/webhooks/route");

    const event = buildStripeEvent(
      "checkout.session.completed" as never,
      {}
    );
    (event as { type: string }).type = "some.unknown.event";

    const req = new Request("http://localhost/api/stripe/webhooks", {
      method: "POST",
      headers: { "stripe-signature": "test_sig" },
      body: JSON.stringify(event),
    });

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const res = await POST(req);

    expect(res.status).toBe(200);
  });
});
