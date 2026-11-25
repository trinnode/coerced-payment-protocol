import { z } from "zod";

export const SCHEMA_VERSION = "0.1";

export const txnStatuses = ["PENDING", "COMPLETED", "FAILED", "REVERSED", "UNKNOWN"] as const;
export const contactStates = ["SAFE", "UNSAFE", "UNKNOWN"] as const;

const transactionSchema = z
  .object({
    ref: z.string().min(6).max(128),
    status: z.enum(txnStatuses),
    channel: z.string().min(2).max(40).optional(),
  })
  .strict();

const customerSchema = z
  .object({
    ref: z.string().min(3).max(128),
  })
  .strict();

const activationSchema = z
  .object({
    method: z.string().min(3).max(64),
    confidence: z.enum(["BANK_AUTHENTICATED", "BANK_HEURISTIC"]),
    band: z.string().min(2).max(64),
  })
  .strict();

const signatureSchema = z
  .object({
    alg: z.literal("Ed25519"),
    key_id: z.string().min(3).max(128),
    value: z.string().min(32).max(512),
  })
  .strict();

const delayedDeliverySchema = z
  .object({
    reason_code: z.enum([
      "PHONE_SEIZED",
      "NO_NETWORK",
      "LEFT_DETENTION",
      "REPORTED_BY_THIRD_PARTY",
      "OTHER",
    ]),
    original_occurred_at: z.string().datetime({ offset: true }),
  })
  .strict();

export const eventEnvelopeSchema = z
  .object({
    schema_version: z.string().regex(/^0\.\d+$/),
    event_id: z.string().uuid(),
    episode_id: z.string().uuid(),
    institution_id: z.string().min(2).max(64),
    event_type: z.literal("SUSPECTED_DURESS"),
    occurred_at: z.string().datetime({ offset: true }),
    transaction: transactionSchema,
    customer: customerSchema,
    activation: activationSchema,
    delayed_delivery: delayedDeliverySchema.optional(),
    signature: signatureSchema,
  })
  .passthrough(); // forward-compatible: unknown fields are ignored, not trusted

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

/**
 * Field names that must never appear anywhere in an envelope. Rejection, not
 * silent stripping: a bank's mistake should surface as an error, not become an
 * incident nobody noticed.
 */
const FORBIDDEN_KEYS = new Set(
  [
    "pin",
    "otp",
    "bvn",
    "pan",
    "card_number",
    "cardnumber",
    "account_number",
    "accountnumber",
    "password",
    "biometric",
    "biometric_template",
    "gps",
    "latitude",
    "longitude",
    "coords",
    "coordinates",
    "narration",
    "narrative",
    "free_text",
    "note",
  ].map((k) => k.toLowerCase()),
);

export function findForbiddenFields(input: unknown, path = "$"): string[] {
  const hits: string[] = [];
  if (Array.isArray(input)) {
    input.forEach((v, i) => hits.push(...findForbiddenFields(v, `${path}[${i}]`)));
    return hits;
  }
  if (input && typeof input === "object") {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      const normalised = k.toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (FORBIDDEN_KEYS.has(normalised)) hits.push(`${path}.${k}`);
      hits.push(...findForbiddenFields(v, `${path}.${k}`));
    }
  }
  return hits;
}

export type ValidationResult =
  | { ok: true; envelope: EventEnvelope }
  | { ok: false; code: string; message: string; details?: unknown };

export function validateEnvelope(body: unknown, now = new Date()): ValidationResult {
  const forbidden = findForbiddenFields(body);
  if (forbidden.length > 0) {
    return {
      ok: false,
      code: "E_FORBIDDEN_FIELD",
      message: "Envelope contains fields that must never be transmitted.",
      details: forbidden,
    };
  }

  const parsed = eventEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      code: "E_SCHEMA",
      message: "Envelope failed schema validation.",
      details: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  }

  const occurred = new Date(parsed.data.occurred_at);
  // Only future-dated events are rejected. Late events are the case the system exists for.
  if (occurred.getTime() - now.getTime() > 120_000) {
    return {
      ok: false,
      code: "E_FUTURE_DATED",
      message: "occurred_at is more than 120s ahead of the receiver clock.",
    };
  }

  return { ok: true, envelope: parsed.data };
}

export const ERROR_HTTP: Record<string, number> = {
  E_SCHEMA: 400,
  E_FORBIDDEN_FIELD: 400,
  E_BAD_SIGNATURE: 401,
  E_UNKNOWN_INSTITUTION: 403,
  E_FUTURE_DATED: 409,
  E_REPLAY: 409,
  E_RATE_LIMITED: 429,
  E_UNAVAILABLE: 503,
  E_NOT_FOUND: 404,
  E_FORBIDDEN: 403,
  E_INVALID_TRANSITION: 409,
  E_STATE_GUARD: 409,
};
