# 04 — Review log

Three independent adversarial reviews were run against v1 of this design record. This page records what they found and what changed as a result. It exists because a design record that only publishes conclusions is a brochure.

**Reviewers:** Nigerian fintech regulatory counsel + independent victim-safeguarding specialist · senior bank mobile-authentication/payments architect · sceptical enterprise investor with African bank GTM experience.

---

## Convergent findings (found independently by two or more reviewers)

| # | Finding | Resolution |
|---|---|---|
| 1 | Concealing a transfer from a coercer by faking receipts or balances is incoherent: alerts, balances and statement lines are emitted below the app. | Withdrawn. Conceal the **signal**, never the **transfer**. Duress runs inside a **PIN-only value band** so requests are identical at the edge. |
| 2 | The bank acquires a **duty of care** by shipping a duress control. | Added as the primary legal objection (C9) and as a pilot-contract requirement. |
| 3 | Willingness to pay is untested and cheaper to test than buildability. | Gate −1 added: 30 days, ~£2.5k, ten meetings, one ask. |
| 4 | Phase 1 is under-budgeted by 4–6×. | Revised to £150–300k to first revenue. |
| 5 | "Legal basis before a hold" cannot coexist with a minutes-level target. | Standing pre-authorised rules replace per-case sign-off; powers named (lien/set-off, PND, CPRegs 2022, injunction). |
| 6 | One `transaction.ref` per event cannot represent a multi-transfer episode. | `episode_id` added as a first-class envelope field. |

---

## Legal and safeguarding

| Finding | Status |
|---|---|
| Phylax makes controller decisions (who is notified, retention, aggregates) — it cannot claim a processor posture | **Fixed.** Declared controller per purpose; DPO and NDPC registration named as prerequisites. |
| No precedence rule between recipient challenge and victim safety | **Fixed.** Victim safety outranks notice; challenge is silent and deferred. |
| Post-closure retention of duress status has no basis | **Fixed.** Delete or irreversibly anonymise at closure unless a statute requires otherwise. |
| "No automatic law-enforcement referral" ignores non-discretionary STR duties (MLPPA 2022 / NFIU) and Cybercrimes Act reporting; a victim cannot authorise concealment of a felony | **Fixed.** Prohibition scoped to *discretionary police referral*; statutory reporting carved out and disclosed to the customer. |
| Intimate-partner abuse listed as an attacker but has no control | **Fixed.** Enrolment itself threat-modelled: discoverable artefacts, shared devices, rotation on demand. |
| `E_STALE_EVENT` at 15 minutes kills the delayed-report case | **Fixed.** Late events accepted; `delayed_delivery` specified and no longer self-attested. |
| No breach protocol | **Fixed.** Breach runbook treats disclosure of duress status as a **life-safety event**; victim notification mandatory. |
| Governance veto contradicted by a dissent clause that permits shipping over it | **Fixed.** Veto is absolute for safety invariants; the dissent route is removed. |
| No affected-person seat, no harm grievance route, no wind-down | **Fixed.** All three added to governance. |
| "A DPIA will fail" overstates | **Softened** to "will not clear without recipient rights". |
| Equity: smartphone-only protects the least-exposed; USSD/POS/agent excluded | **Recorded as a known exclusion**, explicitly not a solved problem. |

## Engineering

| Finding | Status |
|---|---|
| Step-up exemption is logged and observable; biometrics cannot carry duress | **Fixed.** PIN-only band; no bypass flag exists; biometric-only flows excluded from the band. |
| `I6` vs 10-minute target | **Fixed.** Standing rules. |
| Dedupe on client `Idempotency-Key` rather than `(institution_id, event_id)` | **Fixed** in spec. |
| No dead-letter path; permanent `E_STALE_EVENT`; unbounded backoff | **Fixed** in spec. |
| Canonicalisation undefined (`signature` inside the signed body) | **Fixed:** sign `object minus signature`, RFC 8785. |
| `correlation_hint` creates a second, contradictory correlation path | **Removed** from the envelope. |
| `safe_to_contact` transmitted as `UNKNOWN` at T0, wrong at the moment it matters | **Narrowed** to a state held at the sending institution; not transmitted. |
| No key lifetime or revocation-freshness bound | **Added**: max key lifetime, CRL staleness limit, defined quota for `E_RATE_LIMITED`. |
| Gate 1 requires a held-funds case; hold rule is a Phase 2 deliverable | **Fixed.** Gate 1 accepts a fast-referral outcome; hold moved explicitly to Phase 2. |

## Commercial

| Finding | Status |
|---|---|
| MMO conflated design partner with revenue base | **Split** (D2). |
| Investor pass in minute one: can't size the market, £150–300k to first revenue, no sales line | **Recorded** in D9 and the budget table. |
| Revenue paths untested | **Ranked** in the plan: insurer-underwritten peril, agent-float, white-label via a switch, diaspora corridor, cost-per-complaint, rail data. |
| 30-day falsification test missing | **Added** as Gate −1 with pass/fail defined. |

---

## What survived unchanged

Three things no reviewer could break, and which must not be traded away under pressure:

1. **`RECEIVED_NOT_VERIFIED`** and `UNKNOWN` as a first-class terminal state.
2. **"Signal ≠ proof ≠ verdict"** — the only thing between a victim and becoming a defendant, and between a recipient and an unwarranted freeze.
3. **Refusal to hold funds, freeze accounts, or initiate payments.** The sole reason a bank legal team takes the meeting.

---

## Open after review (not fixed, deliberately)

- Pre-credit hold feasibility on NIP is unestablished; it may simply not be possible.
- Band selection may exclude the very transactions most likely to be coerced (high value).
- Enrolment discoverability is mitigated, not solved.
- No primary victim research has been conducted.
- The claim of indistinguishability is now scoped and testable, not absolute — and may still fail the test.
