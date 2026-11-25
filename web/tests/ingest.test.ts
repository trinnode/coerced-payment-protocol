import { beforeAll, describe, expect, it } from "vitest";
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { incidents, institutionKeys } from "@/lib/db/schema";
import { canonicalize } from "@/lib/domain/canonical";
import { POST } from "@/app/api/v1/events/route";

const KEY_ID = `test-key-${randomUUID().slice(0, 8)}`;

function request(body: unknown) {
  return new Request("http://localhost/api/v1/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function envelope(unsigned: Record<string, unknown>, signature?: string) {
  return {
    ...unsigned,
    signature: {
      alg: "Ed25519",
      key_id: KEY_ID,
      value: signature ?? "x".repeat(64),
    },
  };
}

describe("signed event ingestion (real database)", () => {
  let privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"];

  beforeAll(async () => {
    const pair = generateKeyPairSync("ed25519");
    privateKey = pair.privateKey;
    await db.insert(institutionKeys).values({
      institutionId: "bank_kite",
      keyId: KEY_ID,
      publicKeyPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
      expiresAt: new Date(Date.now() + 3600_000),
    });
  });

  const base = () => ({
    schema_version: "0.1",
    event_id: randomUUID(),
    episode_id: randomUUID(),
    institution_id: "bank_kite",
    event_type: "SUSPECTED_DURESS",
    occurred_at: new Date(Date.now() - 5_000).toISOString(),
    transaction: { ref: `NIP-${randomUUID().slice(0, 8)}`, status: "COMPLETED" },
    customer: { ref: "cust_test" },
    activation: {
      method: "PIN_DURESS_ENTRY",
      confidence: "BANK_AUTHENTICATED",
      band: "PIN_ONLY_TIER_1",
    },
  });

  it("rejects a well-formed envelope with a bad signature", async () => {
    const res = await POST(request(envelope(base())));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("E_BAD_SIGNATURE");
  });

  it("accepts a correctly signed event and returns RECEIVED_NOT_VERIFIED", async () => {
    const unsigned = base();
    const signature = sign(null, Buffer.from(canonicalize(unsigned), "utf8"), privateKey).toString("base64");

    const res = await POST(request(envelope(unsigned, signature)));
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.status).toBe("RECEIVED_NOT_VERIFIED");
    expect(body.duplicate).toBe(false);

    const rows = await db
      .select()
      .from(incidents)
      .where(eq(incidents.eventId, unsigned.event_id as string));
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe("CORRELATION_PENDING");
  });

  it("is idempotent on (institution_id, event_id)", async () => {
    const unsigned = base();
    const signature = sign(null, Buffer.from(canonicalize(unsigned), "utf8"), privateKey).toString("base64");
    const body = envelope(unsigned, signature);

    const first = await POST(request(body));
    const second = await POST(request(body));
    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    expect((await second.json()).duplicate).toBe(true);

    const rows = await db
      .select()
      .from(incidents)
      .where(eq(incidents.eventId, unsigned.event_id as string));
    expect(rows).toHaveLength(1);
  });

  it("rejects an event whose key has been revoked", async () => {
    const revokedKey = `test-revoked-${randomUUID().slice(0, 8)}`;
    const pair = generateKeyPairSync("ed25519");
    await db.insert(institutionKeys).values({
      institutionId: "bank_kite",
      keyId: revokedKey,
      publicKeyPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
      expiresAt: new Date(Date.now() + 3600_000),
      revokedAt: new Date(),
    });
    const unsigned = base();
    const signature = sign(null, Buffer.from(canonicalize(unsigned), "utf8"), pair.privateKey).toString("base64");
    const res = await POST(
      request({
        ...unsigned,
        signature: { alg: "Ed25519", key_id: revokedKey, value: signature },
      }),
    );
    expect(res.status).toBe(401);
  });
});
