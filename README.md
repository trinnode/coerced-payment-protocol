# Phylax

**A safer signal when consent is taken away.**

Phylax is a working design for a coerced-payment signalling and incident-coordination layer for financial institutions. It gives a person a discreet way to indicate that a payment is being made under duress, and gives participating institutions a bounded, auditable process for responding — without granting anyone new authority over anyone else's account.

This repository is a **design record in public**, not a product. Nothing here is deployed, approved, endorsed by a bank or a regulator, or proven to work.

---

## The problem, stated plainly

A coerced payment is a transfer that **appears** to be authorised by the account holder, but is not freely given — because of force, threat, detention, or coercive control. Existing bank controls verify that a customer used their device and credentials. They do not — and cannot — verify that the instruction was voluntary.

Public reporting in Nigeria documents repeated cases: people stopped at checkpoints, detained, or threatened, and made to transfer funds while watched. The money moves instantly. The complaint, the investigation, and the dispute process do not.

The gap is not authentication. The gap is between **technical authorisation** and **meaningful consent**, and between **instant payment** and **minute-level response**.

---

## What this is — and is not

| It is | It is not |
|---|---|
| A signalling + coordination design owned by participating institutions | A panic app, or a universal overlay on other banks' apps |
| A protocol for a minimal, signed incident event | A payment rail, switch, escrow, or wallet |
| A workflow for institution-authorised review | A system that freezes, debits, or reverses anything |
| A public threat model and safety specification | A guarantee of recovery |
| A record of decisions, including the uncomfortable ones | A substitute for emergency services, counsel, or a safety plan |

**Non-negotiable:** the platform never holds funds, never initiates a transfer, never freezes an account, never scores a person as guilty, and makes no *discretionary* law-enforcement referral. (Institutions have statutory reporting duties — suspicious transaction reports, cybercrime reporting — which are disclosed to customers and are not a feature of this product.)

---

## Read this in order

| Document | What it answers |
|---|---|
| [`docs/00-assessment.md`](docs/00-assessment.md) | Adversarial review: what kills this idea, and which claims were wrong |
| [`docs/01-master-flow.md`](docs/01-master-flow.md) | The three loops (signal → preservation → accountability) with diagrams |
| [`docs/02-master-plan.md`](docs/02-master-plan.md) | Gate −1 (will you pay?) → Gate 0 (buildable?) → pilot, with budgets and kill criteria |
| [`docs/03-threat-model-and-safety.md`](docs/03-threat-model-and-safety.md) | Attackers, abuse cases, testable safety invariants, breach protocol |
| [`docs/spec/duress-event-v0.1.md`](docs/spec/duress-event-v0.1.md) | The event protocol, open for criticism |
| [`docs/04-review-log.md`](docs/04-review-log.md) | Three independent reviews, and exactly what changed because of them |
| [`docs/research/source-register.md`](docs/research/source-register.md) | What is verified, what is reported, what is still unknown |

---

## The three loops

```
SIGNAL        seconds      inside the bank      "this transfer may not be voluntary"
PRESERVATION  minutes      across institutions  "can the money still be stopped?"
ACCOUNTABILITY hours–weeks  case record         "what happened, who decided, on what basis"
```

Most proposed designs in this space build the third loop and call it the product. The value is in the first two, and the second requires a negotiated institutional control — not software alone.

---

## Status

| Item | State |
|---|---|
| Assessment | v2 — survived three adversarial reviews |
| Threat model | Draft, internally reviewed not externally |
| Event protocol | v0.1 draft, no implementation |
| Willingness to pay (Gate −1) | **Untested** |
| Institutional partner | None |
| Legal review | Not commissioned |
| Pilot | None |

Honest summary: **pre-everything.** The next milestone is not code. It is ten meetings with one question: *"would you sign a six-month pilot, and at what number?"*

## Known limitations

Published because trust is built by stating what does not work:

- It only covers a **PIN-only value band** — above that band, step-up exists and the mechanism is detectable, so high-value transfers are out of scope.
- It does **not** cover USSD, ATM, POS or agent cash-out — often the fastest loss, and often the users most exposed.
- No recovery is guaranteed. Funds may be gone before any institution can act.
- Enrolment may be discoverable by someone who controls the device.
- Coercion by an agent with perceived authority is the modal reported case, and the system's most dangerous context.
- This is not a venture-scale business today. It may be a public-good or rail feature; that is written down rather than dressed up.

---

## How to contribute

Criticism is more useful than enthusiasm. If you can break the threat model, the protocol, or the plan, please do — see [`CONTRIBUTING.md`](CONTRIBUTING.md).

Specifically wanted:

- Bank mobile-authentication engineers willing to say whether a silent, step-up-free duress path is implementable.
- Nigerian fintech/regulatory lawyers able to scope the lawful basis for inter-institution incident sharing.
- Safeguarding and victim-support practitioners willing to review the interaction design.
- Payment-operations staff who can describe what actually happens in the hour after a coerced-transfer complaint.

---

## Safety and disclosure

Do not open a public issue containing a victim's identity, a beneficiary's account details, or an exploitable weakness. See [`SECURITY.md`](SECURITY.md).

If you are in danger now, this repository cannot help you. Contact local emergency services or a trusted person.

---

## Licence

Code: MIT. Documents: CC BY 4.0. See [`LICENSE`](LICENSE).

The name is a working title and is not cleared for use.
