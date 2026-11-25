# Failure runbook

Written for the moment somebody is under pressure. The first instruction in
each case is the one people most want to skip.

## DB unavailable

**Symptom:** `/api/health` returns 503 with `database: down`. Sign-in and case
reads fail. Payment processing is unaffected — Phylax is outside the payment
path by design.

1. Do not "fix" it by pointing at a different database with stale data.
2. Check container/service health and connection count.
3. If a restore is needed, follow `docs/deploy.md` — restore into a fresh
   database, then reconcile.
4. Tell participating institutions that coordination is degraded. Never imply
   payments are stopped; they are not.
5. Record start and end times. This is an audit event, not a footnote.

## Institution key compromised

**Symptom:** forged events, unusual event volume, or a reported key leak.

1. Revoke the key immediately (`institution_keys.revoked_at`). Verification
   rejects revoked keys.
2. Treat every event signed by that key since the suspected compromise as
   unverified. Do not delete them — mark and preserve for review.
3. Issue a replacement key with a new `key_id`; coordinate rotation with the
   institution's security contact.
4. Check for holds or referrals triggered by the forged events and reverse them
   through the institution's own process. Phylax cannot reverse anything itself.
5. Publish an incident notice once affected people have been protected.

## Victim-data breach — life-safety event

This is **not** a data-breach runbook. A breach of the incident store discloses
who was coerced, when, and often where. Treated as a privacy event it becomes a
72-hour form. Treated correctly it is a physical-safety event.

1. **Contain first.** Disable affected access paths; preserve evidence.
2. **Notify affected people directly**, through the safest channel they chose
   at enrolment, in language that does not disclose the incident to a third
   party. A named human owns this. "We could not reach them" requires a
   documented alternative, not a closure.
3. **Do not wait for legal sign-off** before victim contact. Regulator
   notification under NDPA s.40 runs in parallel and does not gate it.
4. Offer the pre-agreed protection package: credential reset, account
   monitoring, and relocation support through a partner organisation.
5. Delay public disclosure until affected people have been reached. Then
   publish fully, redacted only for their safety.
6. Commission an independent review and publish it.

A breach covered up to protect the brand is a second breach.

## Malicious or false activation

1. Never treat the signal as proof. Keep the incident in `UNKNOWN` until a human
   decides; do not coerce it into a verdict.
2. Where a recipient was restricted, open the silent, deferred challenge path.
   Deferral protects the sender and must not be skipped.
3. Record the proportionality decision and the authority reference.
4. Review for repeat patterns only to improve process — never to blacklist a
   corridor, a demographic, or a recipient.

## Unsafe contact

Any contact with a person under coercion that increases their danger is a
**stop event**.

1. Pause the pilot immediately.
2. Preserve the case record and notify the independent safety reviewer.
3. Commission an independent review before resuming.
4. Publish the incident within 90 days of resolution, redacted for safety.

## Outage during an active incident

The bank-side queue is durable and there is a local fallback workflow. If the
platform is down:

1. Do not delay a payment and do not invent a status.
2. Use the documented local workflow to preserve the record.
3. Reconcile when the platform returns; late events are accepted by design.

## Contacts

Named people and channels are intentionally absent from this public document.
In any deployed pilot they must be filled in, reviewed quarterly, and tested —
an unreachable contact tree is not a contact tree.
