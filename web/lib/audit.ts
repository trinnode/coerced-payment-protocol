import { createHash } from "node:crypto";
import { desc, eq, isNull, sql as dsql } from "drizzle-orm";
import { db } from "./db/client";
import { auditEvents } from "./db/schema";
import { canonicalize } from "./domain/canonical";

export type AuditInput = {
  institutionId: string | null;
  actorId?: string | null;
  actorLabel: string;
  action: string;
  objectType: string;
  objectId: string;
  reasonCode?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Append-only audit with a per-institution hash chain.
 *
 * The advisory lock serialises appends for one institution so two concurrent
 * requests cannot both claim the same `prev_hash` and fork the chain.
 */
export async function recordAudit(entry: AuditInput): Promise<string> {
  return db.transaction(async (tx) => {
    const lockKey = entry.institutionId ?? "platform";
    await tx.execute(dsql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);

    const previous = await tx
      .select({ hash: auditEvents.hash })
      .from(auditEvents)
      .where(
        entry.institutionId
          ? eq(auditEvents.institutionId, entry.institutionId)
          : isNull(auditEvents.institutionId),
      )
      .orderBy(desc(auditEvents.id))
      .limit(1);

    const prevHash = previous[0]?.hash ?? null;
    const at = new Date().toISOString();
    const hash = createHash("sha256")
      .update(
        canonicalize({
          prevHash,
          at,
          institutionId: entry.institutionId,
          actorId: entry.actorId ?? null,
          actorLabel: entry.actorLabel,
          action: entry.action,
          objectType: entry.objectType,
          objectId: entry.objectId,
          reasonCode: entry.reasonCode ?? null,
          metadata: entry.metadata ?? null,
        }),
      )
      .digest("hex");

    await tx.insert(auditEvents).values({
      institutionId: entry.institutionId,
      actorId: entry.actorId ?? null,
      actorLabel: entry.actorLabel,
      action: entry.action,
      objectType: entry.objectType,
      objectId: entry.objectId,
      reasonCode: entry.reasonCode ?? null,
      metadata: entry.metadata ?? null,
      prevHash,
      hash,
    });

    return hash;
  });
}

/** Verify a page of audit rows has not been altered in place. */
export async function verifyAuditChain(institutionId: string, limit = 500) {
  const rows = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.institutionId, institutionId))
    .orderBy(auditEvents.id)
    .limit(limit);

  let prev: string | null = null;
  for (const row of rows) {
    if (row.prevHash !== prev) return { ok: false as const, brokenAt: row.id };
    const expected: string = createHash("sha256")
      .update(
        canonicalize({
          prevHash: row.prevHash,
          at: row.createdAt.toISOString(),
          institutionId: row.institutionId,
          actorId: row.actorId,
          actorLabel: row.actorLabel,
          action: row.action,
          objectType: row.objectType,
          objectId: row.objectId,
          reasonCode: row.reasonCode,
          metadata: row.metadata,
        }),
      )
      .digest("hex");
    if (expected !== row.hash) return { ok: false as const, brokenAt: row.id };
    prev = row.hash;
  }
  return { ok: true as const, checked: rows.length };
}
