# Duress Event Protocol — v0.1 (draft for comment)

**Status:** draft. Not implemented by any institution. No security review yet.
**Design goal:** move the minimum bytes necessary to start a human process, and nothing else.

This document is published precisely so it can be attacked. If it is wrong, it is cheaper to be wrong in public now than in a bank's production environment later.

---

## 1. Scope and non-goals

**In scope:** a signed, authenticated notification that a transaction *may* have occurred under coercion, from an institution that owns the transaction to a party that will coordinate a response.

**Non-goals:** authorising a payment, freezing an account, proving coercion, identifying a criminal, moving evidence, or replacing a bank's own fraud systems.

> The event asserts: *"an institution's own authentication layer observed a credential or interaction that its customer configured to mean 'I am not free to refuse'."*
> It does **not** assert that coercion occurred, that a crime occurred, or that any recipient is culpable.

---

## 2. Transport

- HTTPS, TLS 1.2+ (1.3 preferred), mutual TLS between institution and processor.
- `POST` with `Content-Type: application/json; charset=utf-8`.
- Maximum body size 16 KiB. Larger payloads are rejected, not truncated.
- **De-duplication key is `(institution_id, event_id)`.** `event_id` is immutable for the life of the event. A retry re-sends the *same* `event_id`; a durable queue must not mint a new one. Re-sending a different payload under a used `event_id` is an integrity incident (`E_REPLAY`).
- `Idempotency-Key` is advisory only (transport-level retry suppression) and never the system of record for de-duplication.
- Clock skew tolerance: 120 s for the sender's own clock. **Late events are accepted.** A victim may report hours later because the phone was taken; a protocol that rejects the delayed case rejects the case that matters.
- `delayed_delivery` must be a signed field carrying `reason_code` (enum) and `original_occurred_at`, and it changes the incident's SLA class, not its validity.

---

## 3. Envelope

```json
{
  "schema_version": "0.1",
  "event_id": "9f1c...uuid",
  "episode_id": "ep_7d20...uuid",
  "institution_id": "bank_a",
  "event_type": "SUSPECTED_DURESS",
  "occurred_at": "2026-11-25T14:03:11+01:00",
  "transaction": {
    "ref": "opaque-bank-reference",
    "status": "COMPLETED",
    "channel": "MOBILE_APP"
  },
  "customer": {
    "ref": "tok_7f3a"
  },
  "activation": {
    "method": "BANK_DEFINED_DURESS_AUTH",
    "confidence": "BANK_AUTHENTICATED",
    "band": "PIN_ONLY_UNDER_500K"
  },
  "signature": {
    "alg": "Ed25519",
    "key_id": "bank_a-2026-11",
    "value": "base64..."
  }
}
```

### Field rules

| Field | Required | Rule |
|---|---|---|
| `schema_version` | yes | `major.minor`; receiver must reject unknown major |
| `event_id` | yes | UUIDv4, immutable, unique per institution forever; the de-dupe key with `institution_id` |
| `episode_id` | yes | Groups all events from one coercion episode, including later transfers and re-reports. A six-transfer coercion is **one episode, six events**, never six incidents |
| `institution_id` | yes | from the registry; must match the signing key owner |
| `event_type` | yes | enum; v0.1 defines `SUSPECTED_DURESS` only |
| `occurred_at` | yes | RFC 3339 with offset; receiver stores UTC + original offset |
| `transaction.ref` | yes | opaque; never a guessable account number |
| `transaction.status` | yes | `PENDING` \| `COMPLETED` \| `FAILED` \| `REVERSED` \| `UNKNOWN` |
| `customer.ref` | yes | institution-issued token; stable per customer per institution |
| `activation.method` | yes | institution-defined enum, namespaced |
| `activation.confidence` | yes | `BANK_AUTHENTICATED` \| `BANK_HEURISTIC` |
| `activation.band` | yes | the value band the event occurred in; makes band-scoped claims auditable |
| `signature` | yes | detached signature over the canonical body **excluding the `signature` member** (RFC 8785 JCS) |

### Deliberately absent

| Removed | Why |
|---|---|
| `correlation_hint` (amount, beneficiary institution) | Creates a second, contradictory correlation path, and acts as a near-unique selector at the receiving side. Correlation is a bank-side act (§7). |
| `customer.safe_to_contact` | It would be `UNKNOWN` at T0 — wrong at the only moment it matters — and transmitting it into a processor database creates risk with no benefit. Held at the sending institution; retrieved only on a bank-to-bank channel. |
| Any risk score, severity, or "likelihood of coercion" | A score becomes a verdict the moment a human is busy. |

### Canonicalisation

Sign the JCS canonicalisation of the envelope **object with `signature` removed**. Two independent implementations must produce identical bytes for the fixtures in `/fixtures` (to be added). An ambiguous signing surface is an interoperability failure and a forgery surface.

### Forbidden fields (rejected, not ignored)

PIN, OTP, biometric template, BVN, full account number, card PAN, password, device secret, free-text victim narrative, GPS coordinates, and any field named in the institution's data-sharing agreement as excluded.

Rejection (not silent stripping) is deliberate: silent stripping hides a bank's mistake until it becomes an incident.

---

## 4. Response

```json
{
  "accepted": true,
  "event_id": "9f1c...uuid",
  "episode_id": "ep_7d20...uuid",
  "incident_id": "inc_01J...",
  "received_at": "2026-11-25T14:03:12Z",
  "meaning": "RECEIVED_NOT_VERIFIED"
}
```

`202 Accepted` means *received and schema-valid*. It does not mean the incident is verified, actionable, or that any funds will be held. Clients must not surface it as success to a customer.

---

## 5. Error taxonomy

| Code | HTTP | Meaning | Client action |
|---|---|---|---|
| `E_SCHEMA` | 400 | Invalid or missing field | Fix; do not retry |
| `E_FORBIDDEN_FIELD` | 400 | Prohibited data present | Fix; log internally; investigate why |
| `E_BAD_SIGNATURE` | 401 | Signature mismatch | Do not retry; rotate/investigate |
| `E_UNKNOWN_INSTITUTION` | 403 | Institution not registered/active | Contact registry |
| `E_FUTURE_DATED` | 409 | `occurred_at` more than 120 s ahead of receiver clock | Correct the clock; this is the *only* temporal rejection |
| `E_REPLAY` | 409 | `event_id` reused with a different payload | Treat as integrity incident |
| `E_RATE_LIMITED` | 429 | Quota exceeded | Backoff with jitter; never drop silently |
| `E_UNAVAILABLE` | 503 | Processor unavailable | Queue durably; retry with exponential backoff |

**No `E_STALE_EVENT`.** Late events are valid events. The delayed-report case is the case the system exists for.

**Quota (must be specified per institution, not left vague):** sustained 10 events/s, burst 50, per institution; a separate higher ceiling for `delayed_delivery` batches. Values are contractual, published to the institution, and alertable at 80%.

---

## 6. Delivery semantics

- **At-least-once in, exactly-once effect out**, keyed on `(institution_id, event_id)`.
- Institution-side queue is durable and survives app termination; the transfer never waits on it.
- Processor-side notification to a receiving institution reuses the envelope with `notification_type: "INCIDENT_NOTICE"` and a reduced field set (no `customer.ref`, no `activation` detail beyond the fact of the event).
- Delivery receipts are required; an unacknowledged notice escalates on a clock, not on a hope.
- **Bounded retry, then dead-letter.** Retry with exponential backoff and jitter for up to 24 hours, then move to a dead-letter queue with the failure reason. A poison message must not sit head-of-line in a bank queue during an incident. Dead-letter contents are alerted, never silently discarded.
- **Revocation freshness.** Signing keys have a maximum lifetime of 90 days. A revocation is effective at first CRL publication; implementations must refresh at least every 15 minutes and must reject signatures from keys revoked more than 15 minutes previously even if the cache is stale. Key-rotation overlap is 7 days.
- **Notification SLA classes** are derived, not configured per request: `LIVE` (event ≤ 15 min old), `DELAYED` (signed delayed delivery), `HISTORICAL` (re-reported episode). Only `LIVE` enters the minutes-level path.

---

## 7. Correlation

Correlation is a **bank-side** act. The processor may *ask*; it may not conclude, and it has no hint to seed a guess.

```
processor → sending institution: "does this ref exist, and what is its status?"
sending institution → processor: CORRELATED | NOT_CORRELATED | UNKNOWN
```

`UNKNOWN` (timeout, rail ambiguity) is a first-class answer for a review cycle. It is never coerced into a decision; explicit follow-up transitions are allowed, but only with a recorded reason. Forcing a binary is how wrong-case harm happens.

Episode linkage is separate from transaction correlation: a new event with an existing `episode_id` extends the episode; a new `episode_id` for the same customer inside a defined window is a **signal for review**, never an automatic escalation.

---

## 8. Versioning and change policy

- Additive fields: minor bump, receivers must ignore unknown fields.
- Enum additions: minor bump, receivers must handle `UNKNOWN_*` gracefully.
- Removals or semantic changes: major bump, parallel-run period of at least 6 months.
- Any change touching `activation`, `event_type`, the forbidden-field list, or a previously removed field requires safety review sign-off.

---

## 9. Open questions (invitation to critics)

1. Is a single `SUSPECTED_DURESS` type too coarse? Should severity be institution-local and never transmitted?
2. Can the PIN-only band ever include the transactions most likely to be coerced? If not, the protocol covers a subset and must say so in every customer-facing document.
3. How does the protocol avoid becoming a de facto accusation channel when a receiving institution's only tool is a hold?
4. What is the minimum viable recipient-rights record, and where does it live — noting that notifying the recipient can endanger the sender?
5. What stops a compromised institution key from generating a mass-hold event, and is 15-minute revocation freshness fast enough? (Rate limits per institution are a blunt instrument against a legitimate-looking key.)
6. What are the `delayed_delivery.reason_code` values, and can any of them be self-attested without becoming a bypass for the SLA class?
7. Should `episode_id` be visible to a receiving institution at all, or is episode grouping a sending-institution-only fact?

*(The question "can `correlation_hint` be removed?" is answered: yes, and it has been.)*

---

## 10. Anti-goals restated, because they will be pressured

- This protocol will never carry a risk score.
- This protocol will never carry a beneficiary "flag".
- This protocol will never be a freeze instruction.
- This protocol will never be a police referral.

If a future version needs any of those, it is a different protocol and must be argued for publicly from scratch.
