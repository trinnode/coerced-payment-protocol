import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db/client";
import {
  actions,
  auditEvents,
  challenges,
  episodes,
  incidents,
  institutions,
  transactions,
  users,
} from "./db/schema";
import type { Session } from "./auth/session";

/** Every query takes the session and scopes by institutionId. There is no
 *  query path that accepts an arbitrary institution from the caller. */
export async function queueFor(session: Session) {
  const rows = await db
    .select({
      id: incidents.id,
      state: incidents.state,
      band: incidents.band,
      occurredAt: incidents.occurredAt,
      correlation: incidents.correlation,
      actionStatus: incidents.actionStatus,
      amount: sql<number>`coalesce(max(${transactions.amountMinor}), 0)`,
      beneficiary: institutions.shortName,
      episode: episodes.externalEpisodeId,
      customer: episodes.customerRef,
      contact: episodes.contactState,
    })
    .from(incidents)
    .innerJoin(episodes, eq(incidents.episodeId, episodes.id))
    .leftJoin(transactions, eq(transactions.incidentId, incidents.id))
    .leftJoin(institutions, eq(incidents.receivingInstitutionId, institutions.id))
    .where(eq(incidents.institutionId, session.institutionId))
    .groupBy(
      incidents.id,
      incidents.state,
      incidents.band,
      incidents.occurredAt,
      incidents.correlation,
      incidents.actionStatus,
      episodes.externalEpisodeId,
      episodes.customerRef,
      episodes.contactState,
      institutions.shortName,
    )
    .orderBy(desc(incidents.occurredAt))
    .limit(200);

  return rows;
}

export async function incidentFor(session: Session, incidentId: string) {
  const rows = await db
    .select({
      incident: incidents,
      episode: episodes,
      receiving: institutions.shortName,
    })
    .from(incidents)
    .innerJoin(episodes, eq(incidents.episodeId, episodes.id))
    .leftJoin(institutions, eq(incidents.receivingInstitutionId, institutions.id))
    .where(
      and(eq(incidents.id, incidentId), eq(incidents.institutionId, session.institutionId)),
    )
    .limit(1);

  if (!rows[0]) return null;
  const incident = rows[0];

  const txns = await db
    .select()
    .from(transactions)
    .where(eq(transactions.incidentId, incidentId))
    .orderBy(desc(transactions.createdAt));

  const audit = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.institutionId, session.institutionId))
    .orderBy(desc(auditEvents.id))
    .limit(200);

  const incAudit = audit.filter((a) => a.objectId === incidentId);
  const acts = await db.select().from(actions).where(eq(actions.incidentId, incidentId));
  const chals = await db.select().from(challenges).where(eq(challenges.incidentId, incidentId));
  const staff = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.institutionId, session.institutionId));

  const allInstitutions = await db
    .select({ id: institutions.id, name: institutions.shortName, status: institutions.status })
    .from(institutions)
    .where(inArray(institutions.status, ["active", "sandbox"]));

  return {
    ...incident,
    transactions: txns,
    actions: acts,
    challenges: chals,
    audit: incAudit,
    staff,
    institutions: allInstitutions,
  };
}

export async function queueStats(session: Session) {
  const rows = await db
    .select({ state: incidents.state, count: sql<number>`count(*)::int` })
    .from(incidents)
    .where(eq(incidents.institutionId, session.institutionId))
    .groupBy(incidents.state);

  const byState = Object.fromEntries(rows.map((r) => [r.state, r.count])) as Record<string, number>;
  const total = Object.values(byState).reduce((a, b) => a + b, 0);
  const open = Object.entries(byState)
    .filter(([s]) => !["CLOSED", "REJECTED", "RESOLVED"].includes(s))
    .reduce((a, [, n]) => a + n, 0);

  const [timing] = await db
    .select({
      median: sql<number>`coalesce(percentile_cont(0.5) within group (order by extract(epoch from (notified_at - occurred_at))) / 60, 0)::int`,
    })
    .from(incidents)
    .where(
      and(
        eq(incidents.institutionId, session.institutionId),
        sql`${incidents.notifiedAt} is not null`,
      ),
    );

  return { byState, total, open, medianMinutes: timing?.median ?? 0 };
}
