/**
 * RFC 8785-style canonical JSON (JCS subset sufficient for this protocol).
 *
 * Rules implemented:
 *  - object keys sorted by UTF-16 code units
 *  - no insignificant whitespace
 *  - strings via JSON.stringify escaping
 *  - numbers via ECMAScript Number serialisation (JSON.stringify)
 *  - `signature` is always excluded before signing/verifying
 *
 * Anything outside this subset (undefined, functions, BigInt, NaN) throws rather
 * than silently producing a different byte sequence on each implementation.
 */
export function canonicalize(value: unknown): string {
  if (value === null) return "null";

  const t = typeof value;
  if (t === "string" || t === "boolean") return JSON.stringify(value);
  if (t === "number") {
    if (!Number.isFinite(value as number)) throw new Error("non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalize(v)).join(",")}]`;
  }
  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const k of keys) {
      const v = obj[k];
      if (v === undefined) throw new Error(`undefined value at key ${k}`);
      parts.push(`${JSON.stringify(k)}:${canonicalize(v)}`);
    }
    return `{${parts.join(",")}}`;
  }
  throw new Error(`unsupported type: ${t}`);
}

/** Canonical bytes that are actually signed: envelope minus the signature member. */
export function signingPayload(envelope: Record<string, unknown>): string {
  const { signature: _ignored, ...rest } = envelope;
  return canonicalize(rest);
}
