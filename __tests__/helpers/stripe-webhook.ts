/**
 * Test helpers for Stripe webhook integration tests.
 *
 * These helpers create mock Stripe events and a mock Supabase client
 * that tracks all database operations so tests can verify state changes.
 */

// ─── Mock Stripe Event Builder ───

type MockEventType =
  | "checkout.session.completed"
  | "checkout.session.expired"
  | "checkout.session.async_payment_succeeded"
  | "checkout.session.async_payment_failed"
  | "charge.refunded"
  | "charge.dispute.created"
  | "charge.dispute.closed"
  | "account.updated"
  | "payout.failed"
  | "payout.paid";

export function buildStripeEvent(
  type: MockEventType,
  data: Record<string, unknown>,
  account?: string
) {
  return {
    id: `evt_test_${Date.now()}`,
    type,
    data: { object: data },
    account: account || undefined,
  };
}

export function buildCheckoutSession(overrides: {
  deal_id: string;
  milestone_id?: string;
  escrow_amount?: number;
  payment_intent?: string;
  customer_email?: string;
}) {
  return {
    id: `cs_test_${Date.now()}`,
    payment_intent: overrides.payment_intent || `pi_test_${Date.now()}`,
    customer_email: overrides.customer_email || "client@test.com",
    metadata: {
      deal_id: overrides.deal_id,
      milestone_id: overrides.milestone_id || "",
      escrow_amount: String(overrides.escrow_amount || 30000),
    },
  };
}

// ─── Mock Supabase Client ───

type UpdateLog = {
  table: string;
  data: Record<string, unknown>;
  filters: Record<string, unknown>;
};

type InsertLog = {
  table: string;
  data: Record<string, unknown>;
};

export function createMockSupabase(
  seedData: Record<string, Record<string, unknown>[]>
) {
  const updates: UpdateLog[] = [];
  const inserts: InsertLog[] = [];

  function buildQuery(table: string) {
    const filters: Record<string, unknown> = {};
    let selectFields = "*";

    const resolveRows = () => {
      let rows = seedData[table] || [];
      rows = rows.filter((row) => {
        return Object.entries(filters).every(([key, val]) => {
          if (key.startsWith("not_")) {
            const col = key.replace("not_", "");
            if (typeof val === "string" && val.startsWith("in:")) {
              const list = val.slice(3).replace(/^\(|\)$/g, "").split(",").map((s) => s.trim());
              return !list.includes(String((row as Record<string, unknown>)[col]));
            }
            return true;
          }
          if (key.startsWith("in_")) {
            const col = key.replace("in_", "");
            return Array.isArray(val) && val.includes((row as Record<string, unknown>)[col]);
          }
          return (row as Record<string, unknown>)[key] === val;
        });
      });
      return rows;
    };

    const chain: Record<string, unknown> = {
      select(fields?: string) {
        if (fields) selectFields = fields;
        return chain;
      },
      eq(col: string, val: unknown) {
        filters[col] = val;
        return chain;
      },
      not(col: string, op: string, val: unknown) {
        filters[`not_${col}`] = `${op}:${val}`;
        return chain;
      },
      in(col: string, vals: unknown[]) {
        filters[`in_${col}`] = vals;
        return chain;
      },
      maybeSingle() {
        const rows = resolveRows();
        const match = rows[0] || null;
        return Promise.resolve({ data: match, error: null });
      },
      single() {
        return (chain as { maybeSingle: () => Promise<unknown> }).maybeSingle();
      },
      async update(data: Record<string, unknown>) {
        updates.push({ table, data, filters: { ...filters } });
        return {
          eq(col: string, val: unknown) {
            updates[updates.length - 1].filters[col] = val;
            return this;
          },
          not(col: string, op: string, val: unknown) {
            updates[updates.length - 1].filters[`not_${col}`] = `${op}:${val}`;
            return this;
          },
          data: null,
          error: null,
        };
      },
      async insert(data: Record<string, unknown> | Record<string, unknown>[]) {
        const rows = Array.isArray(data) ? data : [data];
        for (const row of rows) {
          inserts.push({ table, data: row });
        }
        return { data: null, error: null };
      },
      then(onFulfilled: (value: { data: Record<string, unknown>[]; error: null }) => unknown) {
        const rows = resolveRows();
        return Promise.resolve(onFulfilled({ data: rows, error: null }));
      },
    };

    void selectFields;
    return chain;
  }

  const client = {
    from(table: string) {
      return buildQuery(table);
    },
  };

  return { client, updates, inserts };
}

// ─── Assertion Helpers ───

export function findUpdate(
  updates: UpdateLog[],
  table: string,
  dataMatch: Record<string, unknown>
): UpdateLog | undefined {
  return updates.find(
    (u) =>
      u.table === table &&
      Object.entries(dataMatch).every(
        ([key, val]) => u.data[key] === val
      )
  );
}

export function findInsert(
  inserts: InsertLog[],
  table: string,
  dataMatch: Record<string, unknown>
): InsertLog | undefined {
  return inserts.find(
    (i) =>
      i.table === table &&
      Object.entries(dataMatch).every(
        ([key, val]) => i.data[key] === val
      )
  );
}
