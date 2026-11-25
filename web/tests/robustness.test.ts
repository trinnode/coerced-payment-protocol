import { beforeAll, describe, expect, it } from "vitest";
import { createHash, generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { episodes, incidents, institutionKeys, users } from "@/lib/db/schema";
import { canonicalize } from "@/lib/domain/canonical";
import { decideAction, ingestEvent } from "@/lib/domain/incidents";
import type { EventEnvelope } from "@/lib/domain/event";

const KEY_ID = `robust-${randomUUID().slice(0, 8)}`;
let privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"];

async function signedEnvelope(ref: string, eventId = randomUUID()) {
  const unsigned = {
    schema_version: "0.1",
    event_id: eventId,
    episode_id: randomUUID(),
    institution_id: "bank_kite",
    event_type: "SUSPECTED_DURESS" as const,
    occurred_at: new Date(Date.now() - 3_000).toISOString(),
    transaction: { ref, status: "COMPLETED" as const },
    customer: { ref: "cust_robust" },
    activation: {
      method: "PIN_DURESS_ENTRY",
      confidence: "BANK_AUTHENTICATED" as const,
      band: "PIN_ONLY_TIER_1",
    },
  };
  const signature = sign(
    null,
    Buffer.from(canonicalize(unsigned), "utf8"),
    privateKey as Parameters<typeof sign>[2],
  ).toString("base64");
  return { envelope: { ...unsigned, signature: { alg: "Ed25519" as const, key_id: KEY_ID, value: signature } } as EventEnvelope, hash: `sha256:${createHashHex(unsigned)}` };
}

function createHashHex(value: unknown) {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

async function freshNotifiedIncident() {
  const [ep] = await db
    .insert(episodes)
    .values({
      institutionId: "bank_kite",
      externalEpisodeId: `robust-${randomUUID()}`,
      customerRef: "cust_robust",
      contactState: "UNKNOWN",
    })
    .returning({ id: episodes.id });
  const [inc] = await db
    .insert(incidents)
    .values({
      institutionId: "bank_kite",
      episodeId: ep.id,
      eventId: randomUUID(),
      state: "NOTIFIED",
      eventType: "SUSPECTED_DURESS",
      activationMethod: "PIN_DURESS_ENTRY",
      activationConfidence: "BANK_AUTHENTICATED",
      band: "PIN_ONLY_TIER_1",
      occurredAt: new Date(),
    })
    .returning({ id: incidents.id });
  return inc.id;
}

describe("robustness regressions", () => {
  beforeAll(async () => {
    const pair = generateKeyPairSync("ed25519");
    privateKey = pair.privateKey;
    await db.insert(institutionKeys).values({
      institutionId: "bank_kite",
      keyId: KEY_ID,
      publicKeyPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
      expiresAt: new Date(Date.now() + 3_600_000),
    });
  });

  it("ingests the same signed event 12 times concurrently exactly once", async () => {
    const { envelope, hash } = await signedEnvelope(`NIP-${randomUUID().slice(0, 8)}`);
    const results = await Promise.all(
      Array.from({ length: 12 }, () => ingestEvent(envelope, hash)),
    );
    expect(results.every((r) => r.incidentId === results[0].incidentId)).toBe(true);
    const rows = await db
      .select({ id: incidents.id })
      .from(incidents)
      .where(eq(incidents.eventId, envelope.event_id));
    expect(rows).toHaveLength(1);
    const raw = await db.execute(sql`select count(*)::int as n from raw_events where event_id = ${envelope.event_id}`);
    expect(Number(raw[0].n)).toBe(1);
  });

  it("rejects reuse of an event_id with a different payload", async () => {
    const ref = `NIP-${randomUUID().slice(0, 8)}`;
    const eventId = randomUUID();
    const first = await signedEnvelope(ref, eventId);
    const second = await signedEnvelope(ref, eventId);
    second.envelope.transaction.ref = `${ref}-CHANGED`;
    await ingestEvent(first.envelope, first.hash);
    await expect(ingestEvent(second.envelope, second.hash)).rejects.toMatchObject({
      code: "E_REPLAY",
    });
  });

  it("allows only one decision under concurrency", async () => {
    const incidentId = await freshNotifiedIncident();
    const [actor] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "tunde.supervisor@kite.example.ng"))
      .limit(1);
    const base = {
      incidentId,
      institutionId: "bank_kite",
      actorId: actor.id,
      actorLabel: "robust:test",
      authorityRef: "CPRegs 2022 / standing rule",
      rationale: "concurrency probe",
      type: "HOLD_REQUEST" as const,
    };
    const results = await Promise.allSettled([
      decideAction({ ...base, decision: "ACCEPTED" }),
      decideAction({ ...base, decision: "DECLINED" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const [row] = await db.select({ state: incidents.state }).from(incidents).where(eq(incidents.id, incidentId));
    expect(row.state).toMatch(/ACTION_(ACCEPTED|DECLINED)/);
  });
});
