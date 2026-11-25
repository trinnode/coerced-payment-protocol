# 03 — Threat model and safety invariants

This is the document a bank CISO, a regulator, and a journalist will read first. It is deliberately blunt about what the system cannot do.

**Scope:** the duress signal, the incident record, and the coordination between institutions.
**Out of scope:** the bank's core banking security, NIP's own integrity, the customer's device malware posture (adjacent, not solved).

---

## 1. Attacker model

| ID | Attacker | Capability | Goal |
|---|---|---|---|
| A1 | Opportunistic coercer | Physical presence, watches screen, may take phone | Complete a transfer; prevent discovery |
| A2 | Organised / detention | Hours of control, multiple devices, repeated transactions, may know the PIN | Extract maximum value; test the mechanism |
| A3 | State-adjacent coercer | Perceived authority, may be able to invoke police processes | Prevent reporting; discredit the victim |
| A4 | Intimate-partner abuser | Long-term account visibility, shared device, coercive control | Ongoing extraction; detect safety features |
| A5 | Malicious claimant | No coercion; wants a refund or to harm a recipient | Weaponise the signal |
| A6 | Insider (bank or platform) | Legitimate access | Curiosity, sale of victim data, obstruction |
| A7 | External attacker | Network position or stolen credentials | Data theft, DoS during incidents, key compromise |
| A8 | Recipient (knowing mule) | Receives and disburses fast | Evade holds |

**Explicitly not defended against:** a coercer who has read this document *and* has unlimited time with the victim and the device. No mechanism survives that. Say so publicly.

---

## 2. Abuse cases and controls

| # | Abuse | Control | Residual risk |
|---|---|---|---|
| U1 | Coercer watches the duress entry and learns it | Same PIN prompt, same request shape, same alerts; rotation offered outside any discoverable "safety" surface | Coercer may force repeated use to test |
| U2 | Coercer notices the missing step-up | Band is **PIN-only by default**, so no step-up exists to be missing; biometric-only bands are excluded, not exempted | Excludes high-value transfers (published limitation) |
| U3 | Victim's phone taken before follow-up | Event validity does not depend on app confirmation; late delivery accepted by design | No further evidence possible |
| U4 | Signal triggers a police report exposing the victim | **Discretionary** referral removed from the product and asserted in CI; statutory STR duty carved out, disclosed at enrolment, handled by the institution's own compliance function | Bank may have an independent statutory duty |
| U4a | Enrolment is discovered by an abuser inspecting the device | No "safety" menu, neutral naming, no discoverable artefact; rotation without in-app trace | Determined inspection of a rooted device |
| U5 | Malicious duress claim to freeze an innocent recipient | Human review; no automated hold; recipient challenge (silent, deferred); proportionality log | Delay in release causes harm |
| U6 | Insider searches for a victim | Case-level ABAC, break-glass with dual control, export reason codes, anomaly alerts on cross-tenant reads | Determined insider with legitimate role |
| U7 | DoS during an active incident | Phylax outside payment path; bank-side durable queue; local fallback workflow | Coordination degrades, not payments |
| U8 | Key compromise → forged events | Per-institution keys, 90-day max lifetime, 15-minute revocation freshness, episode-level anomaly detection | Forged events look real until revoked |
| U9 | Recipient withdraws in < 10 min | Standing hold rule (commercial control), not software | Structural; cannot be fully solved |
| U10 | Signal used to blacklist a corridor or ethnicity | No geographic or demographic scoring; published prohibition; review of any proxy feature | Proxy features sneak in via "risk" data |
| U11 | Recipient learns of a hold and retaliates against the sender | Hold duration capped; notification to beneficiary deferred where the sending institution flags danger; victim-safety outranks notice | Cannot be eliminated once a hold is visible |

---

## 3. Safety invariants (testable)

Each invariant must have an automated or procedural test. An invariant without a test is marketing.

| ID | Invariant | Test |
|---|---|---|
| S1 | Within the configured PIN-only band, a duress transfer produces **no observable channel that a normal transfer does not** — same request shape, same (absent) step-up, same alert, same balance, same statement line | Paired-trial study on the bank's **staging replica**, ≥20 motivated participants repeating trials, pre-registered kill at >20% detection |
| S2 | No customer-facing message is suppressed or fabricated. The transfer is always visible as a transfer | Integration test on every outbound channel; balance reconciliation test |
| S3 | No **discretionary** referral to any law-enforcement endpoint exists in the default configuration; statutory reporting is a separate, disclosed, institution-owned path | Source scan in CI for referral endpoints + code review against the forbidden-capability list + enrolment-copy test |
| S4 | Platform cannot change transaction state, hold, or balance | Contract tests; no privileged rail credentials exist |
| S5 | Every action state change carries an institutional authority reference (standing rule ID or named legal power) | Domain rejection of an empty `authority_ref` in `decideAction`; a database CHECK is proposed, not yet in place |
| S6 | Recipient can challenge and obtain a recorded outcome, **without** the notification endangering the sender | End-to-end test of the deferred-challenge path |
| S7 | A platform outage cannot delay a payment | Chaos test: kill platform, complete transfers |
| S8 | No cross-tenant read is possible, including by admin | Tenant-isolation test suite |
| S9 | No raw PIN, biometric template, BVN, or full account number is stored | Schema + log-scrubbing test |
| S10 | Evidence upload is opt-in, consented at setup, and never required for assistance | Flow test: assistance works with zero evidence |
| S11 | Enrolment leaves no discoverable artefact in the app's normal navigation | Manual inspection study by a participant not told what to look for |
| S12 | Duress status is destroyed at case closure unless a named statute requires retention | Retention job test + destructive-delete verification |

---

## 4. Data classes and handling

| Class | Example | Where it lives | Retention |
|---|---|---|---|
| Identity | customer token | Bank only; platform holds opaque ref | Bank-defined |
| Transaction | ref, amount, beneficiary institution | Bank + minimal platform copy | Case + statutory |
| Incident | event, state, notes | Platform (sensitive) | **Destroyed or irreversibly anonymised at closure** unless a named statute requires otherwise |
| Location | coords, checkpoint context | Off by default | Never by default |
| Evidence | screenshots, documents | Encrypted vault, hash + provenance | Legal hold or 90 days |
| Recipient data | account ref, challenge record | Receiving institution | Their policy |
| Audit | access, decisions | Append-only | 7 years (configurable) |

**Post-closure retention is a deliberate deletion, not a default.** Keeping a "this person was coerced" flag after the case serves analytics and nothing else; it is crime-victim data and a standing target. Only the audit trail (actions, not the underlying incident narrative) survives closure.

**Controller posture.** Phylax decides whom to notify, when, for how long, and what aggregates to publish. Those are controller decisions. It therefore declares itself a controller per purpose, appoints a DPO, and registers as required — it does not shelter behind a "coordination only" processor label.

---

## 5. What we will not build (published commitments)

1. No automated freeze, block, debit or reversal by the platform.
2. No public or cross-institution beneficiary blacklist.
3. No AI determination of whether coercion occurred.
4. No ambient audio/video capture.
5. No GPS-based risk scoring.
6. No demographic, ethnic, religious or political proxies.
7. No blockchain.
8. No **discretionary** law-enforcement referral. (Statutory reporting — STRs to the NFIU under MLPPA 2022, Cybercrimes Act duties — is a legal obligation of the institution, is disclosed to the customer at enrolment, and is not a product feature.)
9. No "undetectable" or "guaranteed recovery" claims.
10. No collection of evidence while a person is under threat.

Any change to this list requires a public ADR, a safety review, and — for items 1, 2, 6 and 8 — external sign-off.

---

## 6. Failure honesty

Published plainly, because trust is built by stating limits:

- The mechanism can be discovered. It can fail. It can be unavailable.
- The signal is not proof, and does not itself create legal authority.
- Recovery is not guaranteed and is often impossible.
- Not all channels are covered (ATM, POS, USSD, agent cash-out are out of MVP scope).
- A victim may never be safe enough to use it.
- Institutions may decline to act.

> A person who reads this list and still trusts the feature is better served than one who was promised certainty.

---

## 7. Breach protocol (life-safety, not merely data)

A breach of the incident store does not disclose "personal data". It discloses **who is a duress victim, when, and often where** — to whoever holds it. Treated as a data event, this is a 72-hour notification. Treated correctly, it is a physical-safety event.

**Required, before any live case:**

1. **Containment first, notification second, but notification is mandatory** — not a legal judgement call. Affected people are told directly, through the safest channel they selected at enrolment, in language that does not itself disclose the incident to a third party.
2. **A named human owns victim notification**, not a template job. "We could not reach them" is an outcome requiring a documented alternative, not a closure.
3. **Pre-agreed protective offer**: account monitoring, PIN/credential reset, consideration of relocation support via a partner organisation.
4. **Regulator notification** under NDPA s.40 runs in parallel and does not gate victim contact.
5. **Public disclosure is delayed until affected people have been reached**, then published in full. A breach covered up to protect the brand is a second breach.
6. **Post-incident**: an independent review, published, including what the attackers obtained.

---

## 8. Known exclusions and equity

Stated because a safety feature that protects the least-exposed is a marketing artefact:

| Excluded in MVP | Consequence |
|---|---|
| USSD users | A large share of the population most exposed to checkpoint and agent coercion cannot use the feature at all |
| ATM, POS, agent cash-out | The cash-out path — often the fastest loss — is untouched |
| Feature phones | No coverage |
| Minors and adults lacking capacity | Safeguarding and guardianship unresolved; excluded rather than improvised |
| Disability and low-literacy users | No tested alternative interaction; the PIN band may be inaccessible |
| Cross-border transfers | Different rails, laws, and response times |
| Shared devices (IPV) | Mitigated at enrolment, not solved |

**The honest framing:** this is a feature for smartphone banking customers in a defined value band. It does not protect everyone, and the people it does not protect are often the most exposed. Any public communication that implies otherwise is a harm in itself.
