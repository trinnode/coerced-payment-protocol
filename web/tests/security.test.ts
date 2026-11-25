import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditEvents, incidents, users } from "@/lib/db/schema";
import { recordAudit, verifyAuditChain } from "@/lib/audit";
import { assignIncident } from "@/lib/domain/incidents";
import { POST } from "@/app/api/v1/events/route";

describe("security regressions", () => {
  const institutionId = "bank_kite";
  let outsiderId: string;
  let incidentId: string;

  beforeAll(async () => {
    await db.execute(sql`delete from rate_limits`);
    const [outsider] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "emeka.ops@adaeze.example.ng"))
      .limit(1);
    outsiderId = outsider.id;
    const [incident] = await db
      .select({ id: incidents.id })
      .from(incidents)
      .where(eq(incidents.institutionId, institutionId))
      .limit(1);
    incidentId = incident.id;
  });

  it("produces an audit chain that verifies, and detects tampering", async () => {
    const before = await verifyAuditChain(institutionId);
    expect(before.ok).toBe(true);

    const [row] = await db
      .select({ id: auditEvents.id, action: auditEvents.action })
      .from(auditEvents)
      .where(eq(auditEvents.institutionId, institutionId))
      .orderBy(sql`id desc`)
      .limit(1);

    try {
      await db
        .update(auditEvents)
        .set({ action: "audit.tampered" })
        .where(eq(auditEvents.id, row.id));
      const after = await verifyAuditChain(institutionId);
      expect(after.ok).toBe(false);
      if (!after.ok) expect(after.brokenAt).toBe(row.id);
    } finally {
      await db
        .update(auditEvents)
        .set({ action: row.action })
        .where(eq(auditEvents.id, row.id));
    }
    expect((await verifyAuditChain(institutionId)).ok).toBe(true);
  });

  it("refuses to assign a case to a user from another institution", async () => {
    await expect(
      assignIncident({
        incidentId,
        institutionId,
        actorId: "00000000-0000-0000-0000-000000000000",
        actorLabel: "test",
        assigneeId: outsiderId,
      }),
    ).rejects.toMatchObject({ code: "E_FORBIDDEN" });
  });

  it("rejects a chunked body larger than the cap", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(JSON.stringify({ schema_version: "0.1", event_id: randomUUID() })));
        controller.enqueue(encoder.encode(" ".repeat(70 * 1024)));
        controller.close();
      },
    });
    const res = await POST(
      new Request("http://localhost/api/v1/events", { method: "POST", body, duplex: "half" } as RequestInit),
    );
    expect(res.status).toBe(413);
    expect((await res.json()).error.message).toBe("Body too large");
  });
});
