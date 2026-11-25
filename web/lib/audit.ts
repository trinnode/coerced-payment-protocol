import { createHmac } from "node:crypto";
import { and, desc, eq, isNull, sql as dsql } from "drizzle-orm";
import { db } from "./db/client";
import { auditEvents } from "./db/schema";
import { canonicalize } from "./domain/canonical";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

function auditSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET missing or too short");
  return s;
}

type HashInput = {
  prevHash: string | null;
  at: string;
  institutionId: string | null;
  actorId: string | null;
  actorLabel: string;
  action: string;
  objectType: string;
  objectId: string;
  reasonCode: string | null;
  metadata: Record<string, unknown> | null;
};

/** Keyed chain: a database writer cannot recompute a hash without the secret. */
function hashEntry(input: HashInput): string {
  return createHmac("sha256", auditSecret()).update(canonicalize(input)).digest("hex");
}

/**
 * Append-only audit with a per-institution HMAC chain.
 *
 * The advisory lock serialises appends for one institution so two concurrent
 * requests cannot both claim the same `prev_hash` and fork the chain.
 */
export async function recordAudit(entry: AuditInput, callerTx?: Tx): Promise<string> {
  const run = async (tx: Tx): Promise<string> => {
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
    const hash = hashEntry({
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
    });

    await tx.insert(auditEvents).values({
      institutionId: entry.institutionId,
      actorId: entry.actorId ?? null,
      actorLabel: entry.actorLabel,
      action: entry.action,
      objectType: entry.objectType,
      objectId: entry.objectId,
      reasonCode: entry.reasonCode ?? null,
      metadata: entry.metadata ?? null,
      // Must match the timestamp inside the hash exactly.
      createdAt: new Date(at),
      prevHash,
      hash,
    });

    return hash;
  };

  // When called from a domain mutation, share that transaction so the audit
  // row and the state change commit or roll back together.
  return callerTx ? run(callerTx) : db.transaction(run);
}

/** Verify that a page of audit rows has not been altered or reordered. */
export async function verifyAuditChain(institutionId: string, pageSize = 500) {
  let prev: string | null = null;
  let checked = 0;
  let after = 0;

  // Cursor pagination: a single capped query would make tampering past row
  // 500 invisible while still reporting success.
  while (true) {
    const rows = await db
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.institutionId, institutionId),
          dsql`${auditEvents.id} > ${after}`,
        ),
      )
      .orderBy(auditEvents.id)
      .limit(pageSize);
    if (rows.length === 0) break;

    for (const row of rows) {
      if (row.prevHash !== prev) return { ok: false as const, brokenAt: row.id };
      const expected = hashEntry({
        prevHash: row.prevHash,
        at: row.createdAt.toISOString(),
        institutionId: row.institutionId,
        actorId: row.actorId,
        actorLabel: row.actorLabel,
        action: row.action,
        objectType: row.objectType,
        objectId: row.objectId,
        reasonCode: row.reasonCode,
        metadata: row.metadata as Record<string, unknown> | null,
      });
      if (expected !== row.hash) return { ok: false as const, brokenAt: row.id };
      prev = row.hash;
      after = row.id;
      checked++;
    }
  }

  return { ok: true as const, checked };
}
