import { inArray, sql } from "drizzle-orm";
import { db } from "./db/client";
import { rateLimits } from "./db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function bucket(now: number, windowMs: number) {
  return Math.floor(now / windowMs);
}

async function countFor(tx: Tx, key: string, windowMs: number, now: number) {
  const current = `${key}:${bucket(now, windowMs)}`;
  const previous = `${key}:${bucket(now, windowMs) - 1}`;
  const rows = await tx
    .select({ key: rateLimits.key, count: rateLimits.count })
    .from(rateLimits)
    .where(inArray(rateLimits.key, [current, previous]));
  return {
    current,
    total: rows.reduce((sum, r) => sum + r.count, 0),
  };
}

async function increment(tx: Tx, key: string, windowMs: number, now: number) {
  const current = `${key}:${bucket(now, windowMs)}`;
  await tx
    .insert(rateLimits)
    .values({ key: current, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: { count: sql`${rateLimits.count} + 1`, updatedAt: new Date() },
    });
}

/**
 * Atomic allowance check. The advisory lock serialises processes sharing this
 * database; the dual-minute sum closes the classic fixed-window boundary hole
 * where a burst could pass at ~2x the nominal rate. Rejected requests do not
 * increment anything.
 */
export async function allowRate(key: string, limit: number, windowMs: number): Promise<boolean> {
  const [allowed] = await allowRateBatch(key, [{ limit, windowMs }]);
  return allowed;
}

/** Check several windows at once; nothing is counted unless all pass. */
export async function allowRateBatch(
  key: string,
  rules: { limit: number; windowMs: number }[],
): Promise<[boolean, ...boolean[]]> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
    const now = Date.now();
    const results = await Promise.all(
      rules.map(async (rule) => (await countFor(tx, key, rule.windowMs, now)).total < rule.limit),
    );
    if (!results.every(Boolean)) return [false, ...rules.map(() => false)] as [boolean, ...boolean[]];
    for (const rule of rules) await increment(tx, key, rule.windowMs, now);
    return results as [boolean, ...boolean[]];
  });
}
