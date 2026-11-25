/**
 * Hard-delete first-party telemetry older than the retention window.
 *
 * This is a deliberate deletion, not a soft flag. It is safe to run repeatedly.
 * Exit code is non-zero on failure so a scheduler notices.
 */
import { config } from "dotenv";
import postgres from "postgres";

config();

const RETENTION_DAYS = 90;
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { max: 1, connect_timeout: 10 });

try {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
  const events = await sql`delete from analytics_events where created_at < ${cutoff}`;
  const vitals = await sql`delete from web_vitals where created_at < ${cutoff}`;
  const limits = await sql`delete from rate_limits where updated_at < ${cutoff}`;

  console.log(
    `pruned before ${cutoff.toISOString()}: analytics=${events.count} vitals=${vitals.count} rate_buckets=${limits.count}`,
  );
} catch (error) {
  console.error("prune failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await sql.end();
}
