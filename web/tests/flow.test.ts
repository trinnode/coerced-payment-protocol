import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { episodes, incidents, users } from "@/lib/db/schema";
import { openChallenge, releaseChallenge } from "@/lib/domain/incidents";

async function freshInvestigation() {
  const [ep] = await db
    .insert(episodes)
    .values({
      institutionId: "bank_kite",
      externalEpisodeId: `flow-${randomUUID()}`,
      customerRef: "cust_flow",
      contactState: "UNKNOWN",
    })
    .returning({ id: episodes.id });
  const [inc] = await db
    .insert(incidents)
    .values({
      institutionId: "bank_kite",
      episodeId: ep.id,
      eventId: randomUUID(),
      state: "INVESTIGATION",
      eventType: "SUSPECTED_DURESS",
      activationMethod: "PIN_DURESS_ENTRY",
      activationConfidence: "BANK_AUTHENTICATED",
      band: "PIN_ONLY_TIER_1",
      occurredAt: new Date(),
    })
    .returning({ id: incidents.id });
  return inc.id;
}

describe("challenge lifecycle", () => {
  it("does not strand a case after the recipient challenge is released", async () => {
    await db.execute(sql`delete from rate_limits`);
    const [actor] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "tunde.supervisor@kite.example.ng"))
      .limit(1);
    const incidentId = await freshInvestigation();
    const base = {
      incidentId,
      institutionId: "bank_kite",
      actorId: actor.id,
      actorLabel: "flow:test",
    };

    await openChallenge({ ...base, deferHours: 1, note: "probe" });
    const opened = await db
      .select({ state: incidents.state })
      .from(incidents)
      .where(eq(incidents.id, incidentId));
    expect(opened[0].state).toBe("RECIPIENT_CHALLENGE");

    await releaseChallenge({ ...base, reason: "victim confirmed safe", earlyRelease: true });
    const released = await db
      .select({ state: incidents.state })
      .from(incidents)
      .where(eq(incidents.id, incidentId));
    expect(released[0].state).toBe("RESOLVED");
  });
});
