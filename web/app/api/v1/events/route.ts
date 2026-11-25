import { createHash, verify } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { institutionKeys, institutions } from "@/lib/db/schema";
import { canonicalize } from "@/lib/domain/canonical";
import { ERROR_HTTP, validateEnvelope } from "@/lib/domain/event";
import { fail } from "@/lib/api";
import { allowRate, allowRateBatch } from "@/lib/rate-limit";
import { ingestEvent } from "@/lib/domain/incidents";

export const runtime = "nodejs";

const BODY_LIMIT = 64 * 1024;
const WINDOW_MS = 60_000;
const BURST = 50;
const RATE = 10;

/**
 * Counters live in Postgres, not process memory. A locked, dual-minute check
 * means rejected requests consume nothing and a boundary burst cannot pass at
 * twice the nominal rate.
 */
async function allowEvent(institutionId?: string): Promise<boolean> {
  const preauth = await allowRate("preauth", 200, WINDOW_MS);
  if (!preauth) return false;
  if (!institutionId) return true;
  const [allowed] = await allowRateBatch(institutionId, [
    { limit: RATE, windowMs: WINDOW_MS },
    { limit: BURST, windowMs: 10 * WINDOW_MS },
  ]);
  return allowed;
}

/** Count bytes while reading. A chunked request has no Content-Length. */
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
  if (!(await allowEvent())) {
    return error("E_RATE_LIMITED", "Request quota exceeded", undefined, { "Retry-After": "60" });
  }

  const raw = await readLimitedBody(request, BODY_LIMIT);
  if (raw === null) return error("E_BODY_TOO_LARGE", "Body too large");

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
  if (!(await allowEvent(institutionId))) {
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
    // DomainError codes are mapped by the shared handler; driver errors are
    // redacted there. Never echo internal messages to an institution.
    return fail(e);
  }
}
