import { beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditEvents, caseNotes, challenges, episodes, incidents, users } from "@/lib/db/schema";
import {
  SLA_AT_RISK_MINUTES,
  addCaseNote,
  contactAllowsNotification,
  notifyReceiving,
  openChallenge,
  releaseChallenge,
  setContactState,
  slaFor,
} from "@/lib/domain/incidents";
import { incidentFor } from "@/lib/queries";
import { SESSION_COOKIE, signSession, type Session } from "@/lib/auth/session";
import { POST } from "@/app/api/incidents/[id]/route";

// The route reads its session through next/headers; keep a signed cookie jar
// in this file so role/tenant guards can be exercised end to end.
const { cookieJar } = vi.hoisted(() => ({ cookieJar: new Map<string, string>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value ? { name, value } : undefined;
    },
    set: () => {},
    delete: () => {},
  }),
}));

const OWNER = "bank_kite";
const OUTSIDER = "mmo_adaeze";

const base = (institutionId: string, role: Session["role"], userId: string, email: string): Session => ({
  userId,
  version: 0,
  institutionId,
  institutionName: institutionId,
  name: email,
  email,
  role,
  exp: Math.floor(Date.now() / 1000) + 3600,
});

async function account(email: string) {
  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!row) throw new Error(`Missing seeded account ${email}`);
  return row;
}

async function fixture(contact: "SAFE" | "UNSAFE" | "UNKNOWN", state: string) {
  const episodeId = randomUUID();
  const incidentId = randomUUID();
  const eventId = randomUUID();
  await db.insert(episodes).values({
    id: episodeId,
    institutionId: OWNER,
    externalEpisodeId: randomUUID(),
    customerRef: `cust_${eventId.slice(0, 8)}`,
    contactState: contact,
  });
  await db.insert(incidents).values({
    id: incidentId,
    institutionId: OWNER,
    episodeId,
    eventId,
    state: state as never,
    eventType: "SUSPECTED_DURESS",
    activationMethod: "PIN_DURESS_ENTRY",
    activationConfidence: "BANK_AUTHENTICATED",
    occurredAt: new Date(),
  });
  return { episodeId, incidentId };
}

async function episodeOf(episodeId: string) {
  const [row] = await db.select().from(episodes).where(eq(episodes.id, episodeId)).limit(1);
  return row;
}

async function challengeOf(incidentId: string) {
  const [row] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.incidentId, incidentId))
    .limit(1);
  return row;
}

describe("console safety surface", () => {
  let supervisorId: string;
  let analystId: string;
  let outsiderId: string;
  let outsiderEmail: string;

  beforeAll(async () => {
    const supervisor = await account("tunde.supervisor@kite.example.ng");
    const analyst = await account("ada.analyst@kite.example.ng");
    const outsider = await account("emeka.ops@adaeze.example.ng");
    supervisorId = supervisor.id;
    analystId = analyst.id;
    outsiderId = outsider.id;
    outsiderEmail = outsider.email;
  });

  it("blocks notification and challenge on UNSAFE contact until a recorded override", async () => {
    const notifyCase = await fixture("UNSAFE", "REVIEW_PENDING");
    await expect(
      notifyReceiving({
        incidentId: notifyCase.incidentId,
        institutionId: OWNER,
        actorLabel: "supervisor:test",
        receivingInstitutionId: OUTSIDER,
      }),
    ).rejects.toMatchObject({ code: "E_STATE_GUARD" });

    const challengeCase = await fixture("UNSAFE", "INVESTIGATION");
    await expect(
      openChallenge({
        incidentId: challengeCase.incidentId,
        institutionId: OWNER,
        actorLabel: "supervisor:test",
        actorId: supervisorId,
        deferHours: 1,
      }),
    ).rejects.toMatchObject({ code: "E_STATE_GUARD" });

    const overridden = await setContactState({
      incidentId: notifyCase.incidentId,
      institutionId: OWNER,
      actorLabel: "supervisor:test",
      actorId: supervisorId,
      actorRole: "supervisor",
      state: "UNSAFE",
      reason: "Customer still with coercer; supervisor authorises notified handover",
      override: true,
    });
    expect(overridden).toMatchObject({ state: "UNSAFE", override: true });
    expect(contactAllowsNotification(await episodeOf(notifyCase.episodeId))).toBe(true);
    await notifyReceiving({
      incidentId: notifyCase.incidentId,
      institutionId: OWNER,
      actorLabel: "supervisor:test",
      receivingInstitutionId: OUTSIDER,
    });
    const [after] = await db
      .select({ state: incidents.state, notifiedAt: incidents.notifiedAt })
      .from(incidents)
      .where(eq(incidents.id, notifyCase.incidentId));
    expect(after.state).toBe("NOTIFIED");
    expect(after.notifiedAt).not.toBeNull();

    const [audit] = await db
      .select()
      .from(auditEvents)
      .where(
        and(eq(auditEvents.objectId, notifyCase.incidentId), eq(auditEvents.action, "contact.set.unsafe")),
      )
      .orderBy(desc(auditEvents.id))
      .limit(1);
    expect(audit.reasonCode).toBe("UNSAFE");
    expect(audit.metadata).toMatchObject({ override: true });
  });

  it("keeps UNKNOWN first-class and refuses a non-privileged override", async () => {
    const unknownCase = await fixture("UNSAFE", "CORRELATED");
    await setContactState({
      incidentId: unknownCase.incidentId,
      institutionId: OWNER,
      actorLabel: "supervisor:test",
      actorId: supervisorId,
      actorRole: "supervisor",
      state: "UNKNOWN",
      reason: "Contact not established",
    });
    const episode = await episodeOf(unknownCase.episodeId);
    expect(episode.contactState).toBe("UNKNOWN");
    expect(episode.contactOverrideBy).toBeNull();
    expect(contactAllowsNotification(episode)).toBe(true);

    const unsafeCase = await fixture("UNSAFE", "INVESTIGATION");
    await expect(
      setContactState({
        incidentId: unsafeCase.incidentId,
        institutionId: OWNER,
        actorLabel: "supervisor:test",
        actorId: supervisorId,
        actorRole: "analyst",
        state: "UNSAFE",
        reason: "not allowed",
        override: true,
      }),
    ).rejects.toMatchObject({ code: "E_FORBIDDEN" });
  });

  it("creates tenant-scoped, audited handover notes", async () => {
    const noteCase = await fixture("SAFE", "CORRELATION_PENDING");
    const created = await addCaseNote({
      incidentId: noteCase.incidentId,
      institutionId: OWNER,
      actorLabel: "supervisor:test",
      actorId: supervisorId,
      body: "Next officer: customer confirmed safe at 09:40; keep monitoring.",
      reasonCode: "SAFETY_HANDOVER",
      type: "HANDOVER",
    });
    expect(created.id).toBeTruthy();
    const [row] = await db.select().from(caseNotes).where(eq(caseNotes.id, created.id));
    expect(row).toMatchObject({
      incidentId: noteCase.incidentId,
      institutionId: OWNER,
      authorId: supervisorId,
      reasonCode: "SAFETY_HANDOVER",
    });

    const detail = await incidentFor(base(OWNER, "supervisor", supervisorId, "supervisor@test"), noteCase.incidentId);
    expect(detail?.notes).toEqual([
      expect.objectContaining({
        note: expect.objectContaining({ body: row.body }),
        authorName: "Tunde Bakare",
      }),
    ]);
    expect(detail?.audit.some((a) => a.action === "note.added")).toBe(false);

    await expect(
      addCaseNote({
        incidentId: noteCase.incidentId,
        institutionId: OUTSIDER,
        actorLabel: "supervisor:test",
        actorId: supervisorId,
        body: "cross-tenant write",
        reasonCode: "HANDOVER",
      }),
    ).rejects.toMatchObject({ code: "E_NOT_FOUND" });
    await expect(
      addCaseNote({
        incidentId: noteCase.incidentId,
        institutionId: OWNER,
        actorLabel: "supervisor:test",
        actorId: outsiderId,
        body: "foreign author",
        reasonCode: "HANDOVER",
      }),
    ).rejects.toMatchObject({ code: "E_FORBIDDEN" });
  });

  it("requires an explicit deferral and an accountable challenge release", async () => {
    const c = await fixture("SAFE", "INVESTIGATION");
    const actor = {
      incidentId: c.incidentId,
      institutionId: OWNER,
      actorLabel: "supervisor:test",
      actorId: supervisorId,
    };
    await expect(openChallenge({ ...actor, deferHours: 73 })).rejects.toMatchObject({ code: "E_STATE_GUARD" });
    await expect(openChallenge({ ...actor, deferHours: undefined })).rejects.toMatchObject({ code: "E_STATE_GUARD" });
    await openChallenge({ ...actor, deferHours: 2 });
    const deferred = await challengeOf(c.incidentId);
    expect(deferred.status).toBe("OPEN");
    expect(deferred.deferredUntil).not.toBeNull();
    expect(deferred.recipientNotified).toBe(false);

    await expect(releaseChallenge({ ...actor, reason: "  " })).rejects.toMatchObject({ code: "E_STATE_GUARD" });
    await expect(releaseChallenge({ ...actor, reason: "safe now" })).rejects.toMatchObject({
      code: "E_STATE_GUARD",
    });
    await releaseChallenge({ ...actor, reason: "Customer verified safe by phone", earlyRelease: true });
    const released = await challengeOf(c.incidentId);
    expect(released).toMatchObject({
      status: "RELEASED",
      recipientNotified: true,
      releasedBy: supervisorId,
      resolutionNote: "Customer verified safe by phone",
    });
    const [audit] = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.objectId, released.id))
      .orderBy(desc(auditEvents.id))
      .limit(1);
    expect(audit.action).toBe("challenge.released");
    expect(audit.reasonCode).toBe("Customer verified safe by phone");
    expect(audit.metadata).toMatchObject({ early_release: true });
    await expect(releaseChallenge({ ...actor, reason: "again" })).rejects.toMatchObject({
      code: "E_STATE_GUARD",
    });

    const zero = await fixture("SAFE", "INVESTIGATION");
    await openChallenge({
      ...actor,
      incidentId: zero.incidentId,
      deferHours: 0,
    });
    expect((await challengeOf(zero.incidentId)).deferredUntil).toBeNull();
    await releaseChallenge({
      ...actor,
      incidentId: zero.incidentId,
      reason: "No deferral was requested; releasing now",
    });
    expect((await challengeOf(zero.incidentId)).status).toBe("RELEASED");
  });

  it("computes the SLA clock from occurrence to notice or now", () => {
    expect(SLA_AT_RISK_MINUTES).toBe(15);
    const now = new Date("2026-11-25T12:00:00Z");
    const occurred = new Date(now.getTime() - 20 * 60_000);
    expect(slaFor(occurred, null, now)).toMatchObject({ elapsedMinutes: 20, atRisk: true, basis: "elapsed" });
    expect(slaFor(occurred, new Date(now.getTime() - 10 * 60_000), now)).toMatchObject({
      elapsedMinutes: 10,
      atRisk: false,
      basis: "notified",
    });
  });

  it("enforces role and tenant guards at the API boundary", async () => {
    const c = await fixture("SAFE", "CORRELATION_PENDING");
    const post = (session: Session, intentBody: Record<string, unknown>) => {
      cookieJar.set(
        SESSION_COOKIE,
        signSession({ ...session, exp: Math.floor(Date.now() / 1000) + 3600 }),
      );
      return POST(
        new Request("http://localhost/api/incidents/" + c.incidentId, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(intentBody),
        }),
        { params: Promise.resolve({ id: c.incidentId }) },
      );
    };

    const analyst = await account("ada.analyst@kite.example.ng");
    const analystSession = base(OWNER, analyst.role as Session["role"], analyst.id, analyst.email);
    const denied = await post(analystSession, {
      intent: "set_contact",
      state: "SAFE",
      reason: "analyst attempt",
    });
    expect(denied.status).toBe(403);
    expect((await denied.json()).error.code).toBe("E_FORBIDDEN");

    const outsiderSession = base(OUTSIDER, "supervisor", outsiderId, outsiderEmail);
    const crossTenant = await post(outsiderSession, {
      intent: "set_contact",
      state: "UNSAFE",
      reason: "cross tenant attempt",
    });
    expect(crossTenant.status).toBe(404);
    expect((await crossTenant.json()).error.code).toBe("E_NOT_FOUND");

    const supervisor = await account("tunde.supervisor@kite.example.ng");
    const allowed = await post(base(OWNER, "supervisor", supervisor.id, supervisor.email), {
      intent: "set_contact",
      state: "SAFE",
      reason: "customer confirmed safe",
    });
    expect(allowed.status).toBe(200);
    expect((await episodeOf(c.episodeId)).contactState).toBe("SAFE");
  });
});
