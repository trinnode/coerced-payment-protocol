import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import {
  actions,
  challenges,
  episodes,
  incidents,
  rawEvents,
  transactions,
} from "../db/schema";
import { recordAudit } from "../audit";
import type { EventEnvelope } from "./event";
import { assertTransition, type State } from "./states";

export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export type IngestResult = {
  incidentId: string;
  duplicate: boolean;
  state: State;
};

/** Ingest a verified envelope. Idempotent on (institutionId, eventId). */
export async function ingestEvent(
  envelope: EventEnvelope,
  payloadHash: string,
): Promise<IngestResult> {
  return db.transaction(async (tx) => {
    // Episode: one coercion episode can carry many transactions.
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
        .returning({ id: episodes.id });
      episodeId = created.id;
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

    await tx.insert(rawEvents).values({
      incidentId: inserted[0]?.id ?? null,
      institutionId: envelope.institution_id,
      eventId: envelope.event_id,
      payload: envelope,
      payloadHash,
      signatureValid: true,
    });

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
      return { incidentId: dupe.id, duplicate: true, state: dupe.state as State };
    }

    await recordAudit({
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
    });

    return { incidentId: inserted[0].id, duplicate: false, state: "CORRELATION_PENDING" };
  });
}

async function loadIncident(incidentId: string, institutionId: string) {
  const [row] = await db
    .select()
    .from(incidents)
    .where(and(eq(incidents.id, incidentId), eq(incidents.institutionId, institutionId)))
    .limit(1);
  if (!row) throw new DomainError("E_NOT_FOUND", "Incident not found for this institution");
  return row;
}

async function move(
  incidentId: string,
  from: State,
  to: State,
  patch: Partial<typeof incidents.$inferInsert> = {},
) {
  assertTransition(from, to);
  await db
    .update(incidents)
    .set({ ...patch, state: to, updatedAt: new Date() })
    .where(eq(incidents.id, incidentId));
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
  const incident = await loadIncident(input.incidentId, input.institutionId);
  if (incident.correlation !== "PENDING" && input.status === "CORRELATED") {
    throw new DomainError("E_STATE_GUARD", "Transaction already correlated");
  }

  if (input.status === "CORRELATED" && !input.transaction) {
    throw new DomainError("E_STATE_GUARD", "A correlated result requires transaction facts");
  }

  if (input.transaction) {
    await db
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

  await move(input.incidentId, incident.state as State, input.status, {
    correlation: input.status,
    correlationNote: input.note ?? null,
    receivingInstitutionId: input.transaction?.beneficiaryInstitutionId ?? null,
  });

  await recordAudit({
    institutionId: input.institutionId,
    actorLabel: input.actorLabel,
    action: `incident.correlate.${input.status.toLowerCase()}`,
    objectType: "incident",
    objectId: input.incidentId,
    reasonCode: input.status,
    metadata: { transaction_ref: input.transaction?.ref ?? null, note: input.note ?? null },
  });

  return { state: input.status };
}

export async function notifyReceiving(input: {
  incidentId: string;
  institutionId: string;
  actorLabel: string;
  receivingInstitutionId: string;
  note?: string;
}) {
  const incident = await loadIncident(input.incidentId, input.institutionId);
  let state = incident.state as State;
  if (state === "CORRELATED") {
    await move(input.incidentId, state, "REVIEW_PENDING");
    state = "REVIEW_PENDING";
  }
  if (state !== "REVIEW_PENDING" && state !== "NOTIFIED") {
    throw new DomainError("E_INVALID_TRANSITION", `Cannot notify from ${state}`);
  }

  if (state === "REVIEW_PENDING") {
    await move(input.incidentId, state, "NOTIFIED", {
      notifiedAt: new Date(),
      receivingInstitutionId: input.receivingInstitutionId,
    });
  } else {
    await db
      .update(incidents)
      .set({ notifiedAt: new Date(), receivingInstitutionId: input.receivingInstitutionId })
      .where(eq(incidents.id, input.incidentId));
  }

  await recordAudit({
    institutionId: input.institutionId,
    actorLabel: input.actorLabel,
    action: "incident.notified",
    objectType: "incident",
    objectId: input.incidentId,
    metadata: { receiving_institution: input.receivingInstitutionId, note: input.note ?? null },
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
  const incident = await loadIncident(input.incidentId, input.institutionId);
  const state = incident.state as State;
  if (state !== "NOTIFIED" && state !== "REVIEW_PENDING" && state !== "ACTION_REQUESTED") {
    throw new DomainError("E_INVALID_TRANSITION", `Cannot record an action from ${state}`);
  }
  if (!input.authorityRef.trim()) {
    throw new DomainError("E_STATE_GUARD", "An institutional authority reference is required");
  }

  if (state !== "ACTION_REQUESTED") {
    await move(input.incidentId, state, "ACTION_REQUESTED");
  }

  const [action] = await db
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

  await move(input.incidentId, "ACTION_REQUESTED", target, {
    actionStatus: input.decision,
    authorityRef: input.authorityRef,
    decisionNote: input.rationale,
  });

  await db
    .update(actions)
    .set({ status: input.decision, decidedAt: new Date(), authorityRef: input.authorityRef })
    .where(eq(actions.id, action.id));

  await recordAudit({
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
  const incident = await loadIncident(input.incidentId, input.institutionId);
  let state = incident.state as State;
  if (state === "ACTION_ACCEPTED" || state === "ACTION_DECLINED" || state === "ACTION_NOT_PERMITTED") {
    await move(input.incidentId, state, "INVESTIGATION");
    state = "INVESTIGATION";
  }
  if (state !== "INVESTIGATION") {
    throw new DomainError("E_INVALID_TRANSITION", `Cannot open a challenge from ${state}`);
  }

  const deferredUntil = input.deferHours
    ? new Date(Date.now() + input.deferHours * 3600_000)
    : null;

  const [challenge] = await db
    .insert(challenges)
    .values({
      incidentId: input.incidentId,
      institutionId: input.institutionId,
      deferredUntil,
      recipientNotified: false,
      resolutionNote: input.note ?? null,
    })
    .returning({ id: challenges.id });

  await move(input.incidentId, "INVESTIGATION", "RECIPIENT_CHALLENGE");

  await recordAudit({
    institutionId: input.institutionId,
    actorId: input.actorId,
    actorLabel: input.actorLabel,
    action: "challenge.opened",
    objectType: "challenge",
    objectId: challenge.id,
    metadata: { deferred_until: deferredUntil?.toISOString() ?? null },
  });
}

export async function closeIncident(input: {
  incidentId: string;
  institutionId: string;
  actorLabel: string;
  actorId: string;
  reason: string;
}) {
  const incident = await loadIncident(input.incidentId, input.institutionId);
  const pending = await db
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

  await move(input.incidentId, incident.state as State, "CLOSED", {
    closedAt: new Date(),
    closeReason: input.reason,
  });

  await recordAudit({
    institutionId: input.institutionId,
    actorId: input.actorId,
    actorLabel: input.actorLabel,
    action: "incident.closed",
    objectType: "incident",
    objectId: input.incidentId,
    reasonCode: input.reason,
  });
}

export async function assignIncident(input: {
  incidentId: string;
  institutionId: string;
  actorLabel: string;
  actorId: string;
  assigneeId: string;
}) {
  await loadIncident(input.incidentId, input.institutionId);
  await db
    .update(incidents)
    .set({ assignedTo: input.assigneeId, updatedAt: new Date() })
    .where(eq(incidents.id, input.incidentId));
  await recordAudit({
    institutionId: input.institutionId,
    actorId: input.actorId,
    actorLabel: input.actorLabel,
    action: "incident.assigned",
    objectType: "incident",
    objectId: input.incidentId,
    metadata: { assignee: input.assigneeId },
  });
}
