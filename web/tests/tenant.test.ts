import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { incidents } from "@/lib/db/schema";
import { incidentFor, queueFor } from "@/lib/queries";
import type { Session } from "@/lib/auth/session";

const asSession = (institutionId: string, role: Session["role"] = "analyst"): Session => ({
  userId: "00000000-0000-0000-0000-000000000000",
  institutionId,
  institutionName: institutionId,
  name: "Test",
  email: "test@example.ng",
  role,
  exp: Math.floor(Date.now() / 1000) + 3600,
});

describe("tenant isolation", () => {
  let incidentId: string;
  let ownerInstitution: string;
  let otherInstitution: string;

  beforeAll(async () => {
    const rows = await db
      .select({ id: incidents.id, institutionId: incidents.institutionId })
      .from(incidents)
      .limit(2);
    if (rows.length < 2) throw new Error("Seed the database before running tenant tests");
    ownerInstitution = rows[0].institutionId;
    otherInstitution = rows.find((r) => r.institutionId !== ownerInstitution)?.institutionId ?? "unknown_institution";
    incidentId = rows[0].id;
  });

  it("returns an incident to its owning institution", async () => {
    const result = await incidentFor(asSession(ownerInstitution), incidentId);
    expect(result).not.toBeNull();
    expect(result?.incident.institutionId).toBe(ownerInstitution);
  });

  it("returns null — not a forbidden error with leaked shape — to another institution", async () => {
    const result = await incidentFor(asSession(otherInstitution), incidentId);
    expect(result).toBeNull();
  });

  it("never includes another institution's cases in the queue", async () => {
    const mine = await queueFor(asSession(ownerInstitution));
    const other = await queueFor(asSession(otherInstitution));
    expect(mine.length).toBeGreaterThan(0);
    for (const row of mine) {
      expect(other.some((o) => o.id === row.id)).toBe(false);
    }
  });

  it("does not leak incident detail through the raw event table", async () => {
    const result = await incidentFor(asSession(otherInstitution), incidentId);
    expect(result?.transactions).toBeUndefined();
    expect(result?.audit).toBeUndefined();
  });
});
