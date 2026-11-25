# 01 — Master flow

The system in one sentence: **a bank-native silent signal tags a live transfer, a bounded hold control buys minutes, and an auditable incident record handles everything that happens after the money moves.**

Three loops, in order of importance:

1. **Signal loop** (seconds) — inside the bank. Decides whether this transfer is flagged.
2. **Preservation loop** (minutes) — across institutions. Decides whether money can be stopped.
3. **Accountability loop** (hours to weeks) — evidence, decisions, complaints, patterns.

The playbook v1.0 built loop 3 and called it the product. Loops 1 and 2 are where the value is.

---

## 1. System context

```mermaid
flowchart TB
  subgraph Person["Person under coercion"]
    V["Victim / account holder"]
  end

  subgraph BankA["Sending institution (authority holder)"]
    APP["Mobile app + auth stack<br/>silent-authorisation path"]
    CORE["Core banking / NIP origination"]
    FRAUD["Fraud operations"]
    LEGAL["Legal & compliance"]
  end

  subgraph Phylax["Phylax (controller for the incident record — never in the payment path)"]
    GW["Signed event gateway"]
    INC["Incident service"]
    CASE["Case + decision log"]
    AUD["Append-only audit"]
  end

  subgraph BankB["Receiving institution"]
    RCV["Fraud / dispute desk"]
    HOLD["Hold / restriction decision"]
  end

  subgraph Rail["Industry rail"]
    NIP["NIP (instant credit)"]
    IDRS["NIBSS IDRS<br/>dispute / representment / arbitration"]
  end

  V -->|"duress credential"| APP
  APP --> CORE --> NIP --> BankB
  APP -->|"signed duress event"| GW --> INC --> CASE --> AUD
  CASE -->|"minimum-necessary notice"| RCV
  RCV --> HOLD
  FRAUD --> CASE
  LEGAL --> CASE
  CASE -.->|"reason code + evidence pack"| IDRS
  FRAUD -.->|"authorised request only"| BankB
```

**Trust boundary:** Phylax sits *outside* the payment path. A Phylax outage must never delay a transfer. That property is load-bearing and must be testable.

---

## 2. Loop 1 — Signal (target: < 2 s, inside the bank)

```mermaid
sequenceDiagram
  autonumber
  participant V as Victim
  participant A as Bank app
  participant Auth as Auth (PIN band)
  participant Core as Core banking
  participant P as Phylax gateway

  V->>A: enter duress PIN (same prompt as normal PIN)
  A->>Auth: verify PIN hash
  Auth-->>A: verified, duress variant
  Note over A: No divergence at the edge:<br/>same PIN widget, same request shape,<br/>same step-up (none, PIN band),<br/>real balance, real alert, real statement line
  A->>Core: authorise real transfer
  Core-->>A: accepted, ref
  A->>P: signed event {episode_id, event_id, txn_ref, ...}
  P-->>A: 202 accepted (received ≠ verified)
  A-->>V: normal success screen
```

**Why the band matters.** In a PIN-only value band the duress request and a normal request are byte-identical at the edge. There is no step-up exemption to log, nothing to suppress, and no lie in the balance. Above that band, step-up exists — and a bypass flag, or an OTP that fails to arrive, is itself the tell. The duress feature therefore cannot cover the highest-value transfers, which is a real, published limitation, not an implementation detail.

**Invariants**
- I1: within the configured band, a duress transfer produces the **same observable channels** as a normal transfer — same request shape, same step-up (none), same SMS/push alert, same balance movement, same statement line. Nothing is hidden except the control-plane notice.
- I2: no duress-specific UI, copy, haptic or timing exists at any point before, during or after the transfer.
- I3: the event is queued durably *before* the receipt renders; delivery may lag, the transfer may not.
- I4: the app never displays "help is on the way".
- I4a: **enrolment** is threat-modelled too — set-up artefacts must not be discoverable by someone who inspects the device, and rotation is available without an in-app "safety" menu.

**Open design questions (must be closed with a bank auth engineer + notification owner):**
- What band is PIN-only today, and does it include the transactions most likely to be coerced?
- Does the alert service fire identically for the duress variant? (Test on the bank's staging replica, not a simulator.)
- How is the duress PIN rotated after a coercer has watched it used, without a discoverable flow?
- Shared device, rooted device, borrowed phone: what is the honest behaviour?

---

## 3. Loop 2 — Preservation (target: < 10 min, cross-institution)

**Status: unproven and possibly impossible on NIP.** A pre-credit hold requires a standing rule negotiated with the receiving institution (and likely NIBSS), not software. Until that exists, Phase 1 delivers a **fast referral**: a human at the receiving institution acts under its existing inbound-credit suspicion powers.

```mermaid
sequenceDiagram
  autonumber
  participant P as Phylax
  participant FA as Sending fraud ops
  participant FB as Receiving fraud ops
  participant L as Standing rule (pre-authorised)

  P->>FA: incident created (auto-classified: suspected duress)
  FA->>FA: verify txn status + beneficiary institution
  FA->>P: correlation result (CORRELATED / UNKNOWN / NOT_CORRELATED)
  alt funds still with receiving institution
    P->>FB: minimum-necessary notice + case ref
    FB->>L: does an agreed standing rule apply? (pre-authorised, no per-case sign-off)
    alt rule applies
      FB->>FB: apply hold within rule limits, notify beneficiary
  else no rule
      FB->>FB: existing inbound-credit suspicion process, human decision
    end
    FB->>P: ACTION_ACCEPTED / DECLINED / NOT_PERMITTED
  else already withdrawn
    P->>FA: mark UNRECOVERABLE, switch to accountability loop
  end
```

**The hard truth:** "funds still with receiving institution" is usually false after ~15 minutes. This loop is only credible if institutions agree a **standing hold rule** for flagged corridors — a negotiated control with a named legal power (lien or set-off, PND instruction, a CPRegs 2022 basis, or an injunction), a value cap, a duration cap, and an allocated liability. That negotiation is the commercial work. Software alone cannot buy minutes it does not have.

**Invariants**
- I5: no action originates from Phylax. Every state change cites an institutional authority reference.
- I6: a hold cites a **pre-authorised standing rule or a named legal power** — never a per-case opinion manufactured under time pressure, and never "the platform said so".
- I7: the receiving institution's own customer (the recipient) has a challenge path — but its **notification is deferred and silent** where disclosing it could endanger the sender. Victim safety outranks notice.
- I7a: a hold is observably visible to the beneficiary. Assume the coercer learns of it within the hold window, and design the rule duration accordingly.

---

## 4. Loop 3 — Accountability (hours to weeks)

```mermaid
flowchart LR
  A["Incident record"] --> B["Evidence (optional, consented)"]
  A --> C["Decision log"]
  A --> D["Recipient challenge / release"]
  A --> E["Complaint + escalation route"]
  A --> F["Aggregate pattern review"]
  F --> G["Policy / regulator input<br/>(no individual accusation)"]
  A -.->|"only on lawful basis"| H["Law enforcement<br/>victim-controlled"]
```

**Invariants**
- I8: no **discretionary** law-enforcement referral. Statutory reporting (STR to the NFIU under MLPPA 2022, Cybercrimes Act duties) is non-discretionary, is **disclosed to the customer at enrolment**, and is not presented as a feature of the product.
- I9: aggregates never resolve to an identifiable beneficiary outside a case.
- I10: every export requires role + reason and is itself an audited event.
- I11: at case closure, duress status is deleted or irreversibly anonymised unless a named statutory obligation requires retention.

---

## 5. Incident state machine (normative)

```mermaid
stateDiagram-v2
  [*] --> RECEIVED
  RECEIVED --> REJECTED: bad signature / replay / future-dated
  RECEIVED --> AUTHENTICATED: verified institution + schema
  AUTHENTICATED --> CORRELATION_PENDING
  CORRELATION_PENDING --> CORRELATED
  CORRELATION_PENDING --> NOT_CORRELATED
  CORRELATION_PENDING --> UNKNOWN: bank timeout
  CORRELATED --> REVIEW_PENDING
  REVIEW_PENDING --> NOTIFIED: receiving institution accepts notice
  REVIEW_PENDING --> CLOSED_NO_ACTION: bank decides no basis
  NOTIFIED --> ACTION_REQUESTED
  ACTION_REQUESTED --> ACTION_ACCEPTED
  ACTION_REQUESTED --> ACTION_DECLINED
  ACTION_REQUESTED --> ACTION_NOT_PERMITTED
  ACTION_ACCEPTED --> INVESTIGATION
  ACTION_DECLINED --> INVESTIGATION
  INVESTIGATION --> RECIPIENT_CHALLENGE
  RECIPIENT_CHALLENGE --> INVESTIGATION
  INVESTIGATION --> RESOLVED
  INVESTIGATION --> REFERRED
  INVESTIGATION --> CLOSED
  RESOLVED --> REOPENED: new transaction linked
  CLOSED --> REOPENED
  REOPENED --> INVESTIGATION
```

Rules: every transition is idempotent on `(incident_id, transition, idempotency_key)`; `UNKNOWN` is a first-class state, never coerced into a decision; terminal states never auto-close while a linked transaction is `PENDING`.

**Episodes, not incidents, are the unit of a coercion.** One incident may span many events; one episode may span many incidents (a re-report after the victim is safe, a later transfer forced in the same detention). `episode_id` is carried on the envelope and is what prevents a six-transfer coercion from becoming six unrelated cases. Cross-episode pattern detection is a review signal, never an automatic escalation.

---

## 6. Build sequence (what exists, when)

```mermaid
flowchart TB
  P0["Gate −1 · 30 days · ~£2.5k<br/>WILL ANYONE PAY?<br/>10 meetings · one ask"] --> G0{"PASS<br/>≥2 signatures or<br/>≥3 named numbers"}
  G0 -->|no| X["Stop"]
  G0 -->|yes| P1["Gate 0 · 90 days · ~£6k<br/>BUILDABLE + LAWFUL<br/>counsel memo · staging paired trials"]
  P1 --> G1{"PASS<br/>engineer ✓ · counsel ✓<br/>detection ≤20%"}
  G1 -->|no| X2["Stop or pivot to<br/>accountability-only"]
  G1 -->|yes| P2["Pilot · 6 months · £150–300k<br/>ONE INSTITUTION<br/>fast referral, not a hold"]
  P2 --> G2{"PASS<br/>minutes saved ·<br/>zero unsafe contact"}
  G2 -->|no| X2
  G2 -->|yes| P3["Phase 2 · 10–18 months<br/>SECOND INSTITUTION + hold rule"]
  P3 --> P4["Phase 3<br/>INDUSTRY: reason code via NIBSS"]
```

Each gate has explicit, pre-registered kill criteria in `02-master-plan.md`. The default at every gate is **no**.

---

## 7. What the public sees vs what stays private

| Public (repo) | Private (held back) |
|---|---|
| Problem definition and boundaries | Victim interview notes, identities, verbatim accounts |
| Safety principles and threat model | Pilot institution identities and internal procedures |
| Event protocol v0.1 + state machine | Hold-rule negotiation positions and legal opinions |
| Assessment, kill criteria, and the review log | Commercial terms, pricing, pipeline |
| Roadmap and governance | Adversarial test results with exploitable detail |
| Source register | Bank-specific auth internals |

Rule: **publish anything a regulator, a bank's CISO, or a hostile journalist could safely read.** Withhold anything that could endanger a participant, expose a bank's controls, or hand an attacker a working map.
