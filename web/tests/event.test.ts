import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ERROR_HTTP, findForbiddenFields, validateEnvelope } from "@/lib/domain/event";

const valid = () => ({
  schema_version: "0.1",
  event_id: randomUUID(),
  episode_id: randomUUID(),
  institution_id: "bank_kite",
  event_type: "SUSPECTED_DURESS" as const,
  occurred_at: new Date(Date.now() - 30_000).toISOString(),
  transaction: { ref: "NIP-ABC123", status: "COMPLETED" as const },
  customer: { ref: "cust_9f21" },
  activation: {
    method: "PIN_DURESS_ENTRY",
    confidence: "BANK_AUTHENTICATED" as const,
    band: "PIN_ONLY_TIER_1",
  },
  signature: { alg: "Ed25519" as const, key_id: "kite-2026-11", value: "x".repeat(64) },
});

describe("event envelope", () => {
  it("accepts a valid envelope", () => {
    expect(validateEnvelope(valid()).ok).toBe(true);
  });

  it("accepts an event delivered hours late — that is the point of the system", () => {
    const e = valid();
    e.occurred_at = new Date(Date.now() - 6 * 3600_000).toISOString();
    e.transaction.status = "UNKNOWN";
    expect(validateEnvelope(e).ok).toBe(true);
  });

  it("rejects future-dated events beyond clock skew", () => {
    const e = valid();
    e.occurred_at = new Date(Date.now() + 10 * 60_000).toISOString();
    const r = validateEnvelope(e);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("E_FUTURE_DATED");
  });

  it("rejects forbidden fields anywhere in the tree", () => {
    const e = valid() as Record<string, unknown>;
    e.transaction = { ...(e.transaction as object), narration: "they made me" };
    const r = validateEnvelope(e);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("E_FORBIDDEN_FIELD");
  });

  it("normalises field names before checking", () => {
    expect(findForbiddenFields({ customer: { Account_Number: "123" } })).toHaveLength(1);
  });

  it("rejects a second event_type", () => {
    const e = valid() as Record<string, unknown>;
    e.event_type = "SUSPICIOUS_ACTIVITY";
    const r = validateEnvelope(e);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("E_SCHEMA");
  });

  it("maps every error code to an HTTP status", () => {
    for (const code of ["E_SCHEMA", "E_BAD_SIGNATURE", "E_FUTURE_DATED", "E_RATE_LIMITED"]) {
      expect(ERROR_HTTP[code]).toBeGreaterThanOrEqual(400);
    }
  });
});
