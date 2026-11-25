/**
 * Verify the HMAC audit chain for every institution.
 * Exits non-zero if any chain is broken — safe to use as a release gate.
 */
import { config } from "dotenv";
import { db, sql } from "../lib/db/client";
import { institutions } from "../lib/db/schema";
import { verifyAuditChain } from "../lib/audit";

config();

let bad = 0;
try {
  const all = await db.select({ id: institutions.id }).from(institutions);
  for (const inst of all) {
    const result = await verifyAuditChain(inst.id);
    if (!result.ok) {
      bad++;
      console.error(`BROKEN chain for ${inst.id} at row ${result.brokenAt}`);
    } else {
      console.log(`OK ${inst.id}: ${result.checked} entries`);
    }
  }
} catch (error) {
  console.error("verification failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await sql.end();
}

if (bad > 0) process.exitCode = 1;
