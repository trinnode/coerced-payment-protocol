import { createHash, verify } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { institutionKeys, institutions, rateLimits } from "@/lib/db/schema";
import { canonicalize } from "@/lib/domain/canonical";
import { ERROR_HTTP, validateEnvelope } from "@/lib/domain/event";
import { ingestEvent } from "@/lib/domain/incidents";

export const runtime = "nodejs";

const BODY_LIMIT = 64 * 1024;
const WINDOW_MS = 60_000;
const BURST = 50;
const RATE = 10;

/**
 * Counters live in Postgres, not in process memory: a restart does not reset
 * them and two app instances share the same limit. The atomic upsert makes the
 * increment safe under concurrency.
 */
async function hitBucket(key: string, windowMs: number): Promise<number> {
  const bucket = Math.floor(Date.now() / windowMs);
  const bucketKey = `${key}:${bucket}`;
  const rows = await db
    .insert(rateLimits)
    .values({ key: bucketKey, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: { count: sql`${rateLimits.count} + 1`, updatedAt: new Date() },
    })
    .returning({ count: rateLimits.count });
  return rows[0]?.count ?? 1;
}

async function rateLimited(key: string): Promise<boolean> {
  const [minute, burst] = await Promise.all([
    hitBucket(key, WINDOW_MS),
    hitBucket(key, 60 * WINDOW_MS),
  ]);
  return minute > RATE || burst > BURST;
}

/** Count bytes while reading. A chunked request has no Content-Length and must
 *  not be able to bypass the body cap. */
async function readLimitedBody(request: Request, limit: number): Promise<string | null> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

function error(code: string, message: string, details?: unknown, extra?: Record<string, string>) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status: ERROR_HTTP[code] ?? 400, headers: extra },
  );
}

function verifyEd25519(publicKeyPem: string, payload: string, signatureBase64: string): boolean {
  // Ed25519 signs the message bytes directly — there is no separate prehash step.
  try {
    return verify(
      null,
      Buffer.from(payload, "utf8"),
      publicKeyPem,
      Buffer.from(signatureBase64, "base64"),
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // One fixed pre-auth bucket: bounded cardinality, no attacker-controlled key.
  if ((await hitBucket("preauth", WINDOW_MS)) > 200) {
    return error("E_RATE_LIMITED", "Request quota exceeded", undefined, { "Retry-After": "60" });
  }

  const raw = await readLimitedBody(request, BODY_LIMIT);
  if (raw === null) return error("E_RATE_LIMITED", "Body too large");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return error("E_SCHEMA", "Body is not valid JSON");
  }

  const validated = validateEnvelope(body);
  if (!validated.ok) return error(validated.code, validated.message, validated.details);
  const envelope = validated.envelope;

  const institutionId = envelope.institution_id;

  const inst = await db
    .select({ id: institutions.id, status: institutions.status })
    .from(institutions)
    .where(eq(institutions.id, institutionId))
    .limit(1);
  if (!inst[0]) return error("E_UNKNOWN_INSTITUTION", "Unknown institution");
  if (inst[0].status !== "active") {
    return error("E_FORBIDDEN", "Institution is not active on this environment");
  }

  const keys = await db
    .select()
    .from(institutionKeys)
    .where(eq(institutionKeys.institutionId, institutionId));
  const now = new Date();
  const key = keys.find(
    (k) =>
      k.keyId === envelope.signature.key_id &&
      !k.revokedAt &&
      k.expiresAt.getTime() > now.getTime(),
  );
  if (!key) return error("E_BAD_SIGNATURE", "No active key with that key_id");

  // Sign the exact bytes of the canonical envelope without the `signature` member.
  const { signature: _sig, ...unsigned } = body as Record<string, unknown>;
  const signedBytes = canonicalize(unsigned);

  if (!verifyEd25519(key.publicKeyPem, signedBytes, envelope.signature.value)) {
    return error("E_BAD_SIGNATURE", "Signature does not verify");
  }

  // Only authenticated tenants create per-institution buckets.
  if (await rateLimited(institutionId)) {
    return error(
      "E_RATE_LIMITED",
      "Institution event quota exceeded",
      undefined,
      { "Retry-After": "60" },
    );
  }

  const payloadHash = `sha256:${createHash("sha256").update(signedBytes).digest("hex")}`;

  try {
    const result = await ingestEvent(envelope, payloadHash);
    return NextResponse.json(
      {
        incident_id: result.incidentId,
        status: "RECEIVED_NOT_VERIFIED",
        meaning:
          "The event was authenticated and queued. No action has been taken and no verdict has been reached.",
        duplicate: result.duplicate,
      },
      { status: 202 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ingestion failed";
    return error("E_UNAVAILABLE", message);
  }
}
