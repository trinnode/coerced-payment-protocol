import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  actions,
  caseNotes,
  challenges,
  episodes,
  incidents,
  rawEvents,
  transactions,
  users,
} from "../db/schema";
import { recordAudit } from "../audit";
import { DomainError } from "./errors";
import type { EventEnvelope } from "./event";
import { assertTransition, type State } from "./states";

export { DomainError } from "./errors";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type IncidentRow = typeof incidents.$inferSelect;
type EpisodeRow = typeof episodes.$inferSelect;

/** Documented escalation threshold. The clock runs from occurrence to notice,
 *  or until now while notice is still pending. No background job is involved. */
export const SLA_AT_RISK_MINUTES = 15;

export function slaFor(occurredAt: Date, notifiedAt: Date | null, now = new Date()) {
  const endsAt = notifiedAt ?? now;
  const elapsedMinutes = Math.max(
    0,
    Math.floor((endsAt.getTime() - occurredAt.getTime()) / 60_000),
  );
  return {
    elapsedMinutes,
    atRisk: elapsedMinutes >= SLA_AT_RISK_MINUTES,
    basis: (notifiedAt ? "notified" : "elapsed") as "notified" | "elapsed",
  };
}

export type IngestResult = {
  incidentId: string;
  duplicate: boolean;
  state: State;
};

/** Serialise mutations for one incident. The advisory lock is held for the
 *  whole transaction, so two concurrent decisions cannot both commit. */
async function withIncidentTx<T>(
  incidentId: string,
  institutionId: string,
  fn: (tx: Tx, incident: IncidentRow) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${incidentId}))`);
    const [incident] = await tx
      .select()
      .from(incidents)
      .where(and(eq(incidents.id, incidentId), eq(incidents.institutionId, institutionId)))
      .limit(1);
    if (!incident) throw new DomainError("E_NOT_FOUND", "Incident not found for this institution");
    return fn(tx, incident);
  });
}

/** Conditional state update. A stale `from` state means somebody else moved
 *  the case first; the loser gets a 409, never a second contradictory write. */
/** The episode is the authority for contact safety. Read it inside the same
 *  incident transaction so a contact change cannot race past the guard. */
async function episodeFor(tx: Tx, incident: IncidentRow): Promise<EpisodeRow> {
  const [episode] = await tx
    .select()
    .from(episodes)
    .where(
      and(eq(episodes.id, incident.episodeId), eq(episodes.institutionId, incident.institutionId)),
    )
    .limit(1);
  if (!episode) throw new DomainError("E_NOT_FOUND", "Episode not found for this incident");
  return episode;
}

type ContactGuardRow = Pick<
  EpisodeRow,
  "contactState" | "contactOverrideBy" | "contactOverrideReason"
>;

/** Domain rule, not a UI hint: only an explicit UNSAFE contact blocks
 *  recipient-facing steps, and only a recorded privileged override lifts it.
 *  UNKNOWN stays first-class — it is never rewritten into SAFE. */
export function contactAllowsNotification(episode: ContactGuardRow): boolean {
  if (episode.contactState !== "UNSAFE") return true;
  return Boolean(episode.contactOverrideBy && episode.contactOverrideReason?.trim());
}

function assertContactAllowsNotification(episode: ContactGuardRow, action: string): void {
  if (!contactAllowsNotification(episode)) {
    throw new DomainError(
      "E_STATE_GUARD",
      `Unsafe contact blocks ${action}: record a supervisor override with a reason first`,
    );
  }
}

async function moveIn(
  tx: Tx,
  incidentId: string,
  from: State,
  to: State,
  patch: Partial<typeof incidents.$inferInsert> = {},
) {
  assertTransition(from, to);
  const updated = await tx
    .update(incidents)
    .set({ ...patch, state: to, updatedAt: new Date() })
    .where(and(eq(incidents.id, incidentId), eq(incidents.state, from)))
    .returning({ id: incidents.id });
  if (updated.length === 0) {
    throw new DomainError("E_INVALID_TRANSITION", `Case changed while the decision was in progress`);
  }
}

/** Ingest a verified envelope. Idempotent on (institutionId, eventId). */
export async function ingestEvent(
  envelope: EventEnvelope,
  payloadHash: string,
): Promise<IngestResult> {
  return db.transaction(async (tx) => {
    // Serialise creation of one episode; the unique index alone would raise a
    // constraint error under a fan-out of identical events.
    const episodeKey = `${envelope.institution_id}:${envelope.episode_id}`;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${episodeKey}))`);

    let episodeId: string;
    const existingEpisode = await tx
      .select({ id: episodes.id })
      .from(episodes)
      .where(
        and(
          eq(episodes.institutionId, envelope.institution_id),
          eq(episodes.externalEpisodeId, envelope.episode_id),
        ),
      )
      .limit(1);

    if (existingEpisode[0]) {
      episodeId = existingEpisode[0].id;
    } else {
      const [created] = await tx
        .insert(episodes)
        .values({
          institutionId: envelope.institution_id,
          externalEpisodeId: envelope.episode_id,
          customerRef: envelope.customer.ref,
          contactState: "UNKNOWN",
        })
        .onConflictDoNothing({ target: [episodes.institutionId, episodes.externalEpisodeId] })
        .returning({ id: episodes.id });
      if (created) {
        episodeId = created.id;
      } else {
        const [found] = await tx
          .select({ id: episodes.id })
          .from(episodes)
          .where(
            and(
              eq(episodes.institutionId, envelope.institution_id),
              eq(episodes.externalEpisodeId, envelope.episode_id),
            ),
          )
          .limit(1);
        if (!found) throw new DomainError("E_UNAVAILABLE", "Episode disappeared during ingest");
        episodeId = found.id;
      }
    }

    const inserted = await tx
      .insert(incidents)
      .values({
        institutionId: envelope.institution_id,
        episodeId,
        eventId: envelope.event_id,
        state: "CORRELATION_PENDING",
        eventType: envelope.event_type,
        activationMethod: envelope.activation.method,
        activationConfidence: envelope.activation.confidence,
        band: envelope.activation.band,
        occurredAt: new Date(envelope.occurred_at),
      })
      .onConflictDoNothing({ target: [incidents.institutionId, incidents.eventId] })
      .returning({ id: incidents.id, state: incidents.state });

    if (!inserted[0]) {
      const [dupe] = await tx
        .select({ id: incidents.id, state: incidents.state })
        .from(incidents)
        .where(
          and(
            eq(incidents.institutionId, envelope.institution_id),
            eq(incidents.eventId, envelope.event_id),
          ),
        )
        .limit(1);
      if (!dupe) throw new DomainError("E_UNAVAILABLE", "Incident disappeared during ingest");

      const [seen] = await tx
        .select({ payloadHash: rawEvents.payloadHash })
        .from(rawEvents)
        .where(
          and(
            eq(rawEvents.institutionId, envelope.institution_id),
            eq(rawEvents.eventId, envelope.event_id),
          ),
        )
        .limit(1);
      if (seen && seen.payloadHash !== payloadHash) {
        throw new DomainError("E_REPLAY", "event_id reused with a different payload");
      }
      // Record the retry against the existing case, never as an orphan row.
      await tx
        .insert(rawEvents)
        .values({
          incidentId: dupe.id,
          institutionId: envelope.institution_id,
          eventId: envelope.event_id,
          payload: envelope,
          payloadHash,
          signatureValid: true,
        })
        .onConflictDoNothing({ target: [rawEvents.institutionId, rawEvents.eventId] });

      return { incidentId: dupe.id, duplicate: true, state: dupe.state as State };
    }

    await tx.insert(rawEvents).values({
      incidentId: inserted[0].id,
      institutionId: envelope.institution_id,
      eventId: envelope.event_id,
      payload: envelope,
      payloadHash,
      signatureValid: true,
    });

    await recordAudit(
      {
        institutionId: envelope.institution_id,
        actorLabel: `institution:${envelope.institution_id}`,
        action: "incident.received",
        objectType: "incident",
        objectId: inserted[0].id,
        metadata: {
          event_id: envelope.event_id,
          episode_id: envelope.episode_id,
          activation: envelope.activation,
        },
      },
      tx,
    );

    return { incidentId: inserted[0].id, duplicate: false, state: "CORRELATION_PENDING" };
  });
}

export async function correlate(input: {
  incidentId: string;
  institutionId: string;
  actorLabel: string;
  status: "CORRELATED" | "NOT_CORRELATED" | "UNKNOWN";
  note?: string;
  transaction?: {
    ref: string;
    status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED" | "UNKNOWN";
    amountMinor: number;
    currency?: string;
    beneficiaryInstitutionId?: string | null;
    beneficiaryToken?: string | null;
  };
}) {
  return withIncidentTx(input.incidentId, input.institutionId, async (tx, incident) => {
    if (incident.correlation !== "PENDING" && input.status === "CORRELATED") {
      throw new DomainError("E_STATE_GUARD", "Transaction already correlated");
    }
    if (input.status === "CORRELATED" && !input.transaction) {
      throw new DomainError("E_STATE_GUARD", "A correlated result requires transaction facts");
    }

    if (input.transaction) {
      await tx
        .insert(transactions)
        .values({
          incidentId: input.incidentId,
          institutionId: input.institutionId,
          ref: input.transaction.ref,
          status: input.transaction.status,
          amountMinor: input.transaction.amountMinor,
          currency: input.transaction.currency ?? "NGN",
          beneficiaryInstitutionId: input.transaction.beneficiaryInstitutionId ?? null,
          beneficiaryToken: input.transaction.beneficiaryToken ?? null,
        })
        .onConflictDoNothing({ target: [transactions.institutionId, transactions.ref] });
    }

    await moveIn(tx, input.incidentId, incident.state as State, input.status, {
      correlation: input.status,
      correlationNote: input.note ?? null,
      receivingInstitutionId: input.transaction?.beneficiaryInstitutionId ?? null,
    });

    await recordAudit(
      {
        institutionId: input.institutionId,
        actorLabel: input.actorLabel,
        action: `incident.correlate.${input.status.toLowerCase()}`,
        objectType: "incident",
        objectId: input.incidentId,
        reasonCode: input.status,
        metadata: { transaction_ref: input.transaction?.ref ?? null, note: input.note ?? null },
      },
      tx,
    );

    return { state: input.status };
  });
}

export async function notifyReceiving(input: {
  incidentId: string;
  institutionId: string;
  actorLabel: string;
  receivingInstitutionId: string;
  note?: string;
}) {
  return withIncidentTx(input.incidentId, input.institutionId, async (tx, incident) => {
    assertContactAllowsNotification(await episodeFor(tx, incident), "notification");
    let state = incident.state as State;
    if (state === "CORRELATED") {
      await moveIn(tx, input.incidentId, state, "REVIEW_PENDING");
      state = "REVIEW_PENDING";
    }
    if (state !== "REVIEW_PENDING" && state !== "NOTIFIED") {
      throw new DomainError("E_INVALID_TRANSITION", `Cannot notify from ${state}`);
    }

    if (state === "REVIEW_PENDING") {
      await moveIn(tx, input.incidentId, state, "NOTIFIED", {
        notifiedAt: new Date(),
        receivingInstitutionId: input.receivingInstitutionId,
      });
    } else {
      await tx
        .update(incidents)
        .set({ notifiedAt: new Date(), receivingInstitutionId: input.receivingInstitutionId })
        .where(eq(incidents.id, input.incidentId));
    }

    await recordAudit(
      {
        institutionId: input.institutionId,
        actorLabel: input.actorLabel,
        action: "incident.notified",
        objectType: "incident",
        objectId: input.incidentId,
        metadata: { receiving_institution: input.receivingInstitutionId, note: input.note ?? null },
      },
      tx,
    );
  });
}

export async function decideAction(input: {
  incidentId: string;
  institutionId: string;
  actorLabel: string;
  actorId: string;
  type: "HOLD_REQUEST" | "RELEASE" | "CORRECTION" | "ESCALATE";
  decision: "ACCEPTED" | "DECLINED" | "NOT_PERMITTED";
  authorityRef: string;
  rationale: string;
  standingRuleId?: string | null;
}) {
  return withIncidentTx(input.incidentId, input.institutionId, async (tx, incident) => {
    const state = incident.state as State;
    if (state !== "NOTIFIED" && state !== "REVIEW_PENDING" && state !== "ACTION_REQUESTED") {
      throw new DomainError("E_INVALID_TRANSITION", `Cannot record an action from ${state}`);
    }
    if (!input.authorityRef.trim()) {
      throw new DomainError("E_STATE_GUARD", "An institutional authority reference is required");
    }

    const decided = await tx
      .select({ id: actions.id })
      .from(actions)
      .where(eq(actions.incidentId, input.incidentId))
      .limit(1);
    if (decided.length > 0) {
      throw new DomainError("E_STATE_GUARD", "A decision already exists for this case");
    }

    if (state !== "ACTION_REQUESTED") {
      await moveIn(tx, input.incidentId, state, "ACTION_REQUESTED");
    }

    const [action] = await tx
      .insert(actions)
      .values({
        incidentId: input.incidentId,
        type: input.type,
        status: "REQUESTED",
        requestedBy: input.actorId,
        authorityRef: input.authorityRef,
        standingRuleId: input.standingRuleId ?? null,
        rationale: input.rationale,
      })
      .returning({ id: actions.id });

    const target: State =
      input.decision === "ACCEPTED"
        ? "ACTION_ACCEPTED"
        : input.decision === "DECLINED"
          ? "ACTION_DECLINED"
          : "ACTION_NOT_PERMITTED";

    await moveIn(tx, input.incidentId, "ACTION_REQUESTED", target, {
      actionStatus: input.decision,
      authorityRef: input.authorityRef,
      decisionNote: input.rationale,
    });

    await tx
      .update(actions)
      .set({ status: input.decision, decidedAt: new Date(), authorityRef: input.authorityRef })
      .where(eq(actions.id, action.id));

    await recordAudit(
      {
        institutionId: input.institutionId,
        actorId: input.actorId,
        actorLabel: input.actorLabel,
        action: `action.${input.type.toLowerCase()}.${input.decision.toLowerCase()}`,
        objectType: "incident",
        objectId: input.incidentId,
        reasonCode: input.decision,
        metadata: {
          authority_ref: input.authorityRef,
          standing_rule_id: input.standingRuleId ?? null,
          rationale: input.rationale,
        },
      },
      tx,
    );
  });
}

export async function openChallenge(input: {
  incidentId: string;
  institutionId: string;
  actorLabel: string;
  actorId: string;
  note?: string;
  deferHours?: number;
}) {
  return withIncidentTx(input.incidentId, input.institutionId, async (tx, incident) => {
    // Deferral is always an explicit choice. There is no silent default and no
    // automatic expiry — 0 means "do not defer", and is itself audited.
    const hours = input.deferHours;
    if (typeof hours !== "number" || !Number.isInteger(hours) || hours < 0 || hours > 72) {
      throw new DomainError("E_STATE_GUARD", "Choose a deferral between 0 and 72 hours");
    }
    assertContactAllowsNotification(await episodeFor(tx, incident), "recipient challenge");
    let state = incident.state as State;
    if (
      state === "ACTION_ACCEPTED" ||
      state === "ACTION_DECLINED" ||
      state === "ACTION_NOT_PERMITTED"
    ) {
      await moveIn(tx, input.incidentId, state, "INVESTIGATION");
      state = "INVESTIGATION";
    }
    if (state !== "INVESTIGATION") {
      throw new DomainError("E_INVALID_TRANSITION", `Cannot open a challenge from ${state}`);
    }

    const deferredUntil = hours > 0 ? new Date(Date.now() + hours * 3600_000) : null;

    const [challenge] = await tx
      .insert(challenges)
      .values({
        incidentId: input.incidentId,
        institutionId: input.institutionId,
        deferredUntil,
        recipientNotified: false,
        resolutionNote: input.note ?? null,
      })
      .returning({ id: challenges.id });

    await moveIn(tx, input.incidentId, "INVESTIGATION", "RECIPIENT_CHALLENGE");

    await recordAudit(
      {
        institutionId: input.institutionId,
        actorId: input.actorId,
        actorLabel: input.actorLabel,
        action: "challenge.opened",
        objectType: "challenge",
        objectId: challenge.id,
        metadata: {
          defer_hours: hours,
          deferred_until: deferredUntil?.toISOString() ?? null,
          recipient_notified: false,
        },
      },
      tx,
    );
  });
}

/** Release of a challenge is the moment the recipient is contacted. It cannot
 *  happen silently: a reason is mandatory, and skipping an active deferral
 *  needs an explicit confirmation that is itself recorded. */
export async function releaseChallenge(input: {
  incidentId: string;
  institutionId: string;
  actorLabel: string;
  actorId: string;
  reason: string;
  earlyRelease?: boolean;
}) {
  return withIncidentTx(input.incidentId, input.institutionId, async (tx, incident) => {
    if (!input.reason.trim()) {
      throw new DomainError("E_STATE_GUARD", "A challenge release reason is required");
    }
    assertContactAllowsNotification(await episodeFor(tx, incident), "challenge release");

    const [challenge] = await tx
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.incidentId, input.incidentId),
          eq(challenges.institutionId, input.institutionId),
        ),
      )
      .limit(1);
    if (!challenge) throw new DomainError("E_NOT_FOUND", "No challenge for this case");
    if (challenge.status !== "OPEN") {
      throw new DomainError("E_STATE_GUARD", "Challenge is no longer open");
    }

    const early = Boolean(challenge.deferredUntil && challenge.deferredUntil.getTime() > Date.now());
    if (early && input.earlyRelease !== true) {
      throw new DomainError(
        "E_STATE_GUARD",
        "Deferral is still active: explicitly confirm early release",
      );
    }

    const updated = await tx
      .update(challenges)
      .set({
        status: "RELEASED",
        recipientNotified: true,
        resolvedAt: new Date(),
        resolutionNote: input.reason.trim(),
        releasedBy: input.actorId,
        releasedAt: new Date(),
      })
      .where(
        and(
          eq(challenges.id, challenge.id),
          eq(challenges.institutionId, input.institutionId),
          eq(challenges.status, "OPEN"),
        ),
      )
      .returning({ id: challenges.id });
    if (updated.length === 0) {
      throw new DomainError("E_STATE_GUARD", "Challenge changed while the release was in progress");
    }

    await recordAudit(
      {
        institutionId: input.institutionId,
        actorId: input.actorId,
        actorLabel: input.actorLabel,
        action: "challenge.released",
        objectType: "challenge",
        objectId: challenge.id,
        reasonCode: input.reason.trim(),
        metadata: {
          early_release: early,
          deferred_until: challenge.deferredUntil?.toISOString() ?? null,
          recipient_notified: true,
        },
      },
      tx,
    );

    // A released challenge is a completed case. Leaving the incident in
    // RECIPIENT_CHALLENGE strands it — no other intent can move it.
    await moveIn(tx, input.incidentId, "RECIPIENT_CHALLENGE", "RESOLVED", {
      decisionNote: `Recipient challenge released: ${input.reason.trim()}`,
    });
  });
}

/** Append-only handover note. The author must be an active member of the
 *  incident's institution; notes are never editable or deletable. */
export async function addCaseNote(input: {
  incidentId: string;
  institutionId: string;
  actorLabel: string;
  actorId: string;
  body: string;
  reasonCode: string;
  type?: string;
}) {
  return withIncidentTx(input.incidentId, input.institutionId, async (tx) => {
    const body = input.body.trim();
    const reasonCode = input.reasonCode.trim();
    if (!body || !reasonCode) {
      throw new DomainError("E_STATE_GUARD", "A note body and reason code are required");
    }
    const [author] = await tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, input.actorId),
          eq(users.institutionId, input.institutionId),
          eq(users.active, true),
        ),
      )
      .limit(1);
    if (!author) throw new DomainError("E_FORBIDDEN", "Author is not an active member of this institution");

    const [note] = await tx
      .insert(caseNotes)
      .values({
        incidentId: input.incidentId,
        institutionId: input.institutionId,
        authorId: input.actorId,
        body,
        reasonCode,
        type: input.type?.trim() || "HANDOVER",
      })
      .returning({ id: caseNotes.id });

    await recordAudit(
      {
        institutionId: input.institutionId,
        actorId: input.actorId,
        actorLabel: input.actorLabel,
        action: "note.added",
        objectType: "incident",
        objectId: input.incidentId,
        reasonCode,
        metadata: { note_id: note.id, type: input.type?.trim() || "HANDOVER" },
      },
      tx,
    );
    return { id: note.id };
  });
}

/** Contact safety is a written state, not a display string. Every change is
 *  audited; only a privileged officer may lift an UNSAFE contact block. */
export async function setContactState(input: {
  incidentId: string;
  institutionId: string;
  actorLabel: string;
  actorId: string;
  actorRole: string;
  state: "SAFE" | "UNSAFE" | "UNKNOWN";
  reason: string;
  override?: boolean;
}) {
  return withIncidentTx(input.incidentId, input.institutionId, async (tx, incident) => {
    const reason = input.reason.trim();
    if (!reason) throw new DomainError("E_STATE_GUARD", "A contact state reason is required");
    if (!["SAFE", "UNSAFE", "UNKNOWN"].includes(input.state)) {
      throw new DomainError("E_STATE_GUARD", "Unknown contact state");
    }

    const privileged = input.actorRole === "supervisor" || input.actorRole === "compliance";
    const override = input.override === true;
    if (override && (!privileged || input.state !== "UNSAFE")) {
      throw new DomainError(
        "E_FORBIDDEN",
        "Only a supervisor or compliance officer may override an UNSAFE contact",
      );
    }

    const episode = await episodeFor(tx, incident);
    const updated = await tx
      .update(episodes)
      .set({
        contactState: input.state,
        contactOverrideBy: override ? input.actorId : null,
        contactOverrideReason: override ? reason : null,
        contactOverrideAt: override ? new Date() : null,
      })
      .where(and(eq(episodes.id, episode.id), eq(episodes.institutionId, input.institutionId)))
      .returning({ id: episodes.id });
    if (updated.length === 0) {
      throw new DomainError("E_STATE_GUARD", "Episode changed while the contact state was in progress");
    }

    await recordAudit(
      {
        institutionId: input.institutionId,
        actorId: input.actorId,
        actorLabel: input.actorLabel,
        action: `contact.set.${input.state.toLowerCase()}`,
        objectType: "incident",
        objectId: input.incidentId,
        reasonCode: input.state,
        metadata: { reason, override, previous_state: episode.contactState },
      },
      tx,
    );
    return { state: input.state, override };
  });
}

export async function closeIncident(input: {
  incidentId: string;
  institutionId: string;
  actorLabel: string;
  actorId: string;
  reason: string;
}) {
  return withIncidentTx(input.incidentId, input.institutionId, async (tx, incident) => {
    const pending = await tx
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.incidentId, input.incidentId), eq(transactions.status, "PENDING")))
      .limit(1);
    if (pending.length > 0) {
      throw new DomainError("E_STATE_GUARD", "Cannot close while a linked transaction is PENDING");
    }
    if (!input.reason.trim()) {
      throw new DomainError("E_STATE_GUARD", "A closure reason is required");
    }

    await moveIn(tx, input.incidentId, incident.state as State, "CLOSED", {
      closedAt: new Date(),
      closeReason: input.reason,
    });

    await recordAudit(
      {
        institutionId: input.institutionId,
        actorId: input.actorId,
        actorLabel: input.actorLabel,
        action: "incident.closed",
        objectType: "incident",
        objectId: input.incidentId,
        reasonCode: input.reason,
      },
      tx,
    );
  });
}

export async function assignIncident(input: {
  incidentId: string;
  institutionId: string;
  actorLabel: string;
  actorId: string;
  assigneeId: string;
}) {
  return withIncidentTx(input.incidentId, input.institutionId, async (tx) => {
    const [assignee] = await tx
      .select({ id: users.id, active: users.active, institutionId: users.institutionId })
      .from(users)
      .where(eq(users.id, input.assigneeId))
      .limit(1);
    if (!assignee || !assignee.active || assignee.institutionId !== input.institutionId) {
      throw new DomainError("E_FORBIDDEN", "Assignee is not an active member of this institution");
    }
    await tx
      .update(incidents)
      .set({ assignedTo: input.assigneeId, updatedAt: new Date() })
      .where(eq(incidents.id, input.incidentId));

    await recordAudit(
      {
        institutionId: input.institutionId,
        actorId: input.actorId,
        actorLabel: input.actorLabel,
        action: "incident.assigned",
        objectType: "incident",
        objectId: input.incidentId,
        metadata: { assignee: input.assigneeId },
      },
      tx,
    );
  });
}
