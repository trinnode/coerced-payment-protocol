# 02 — Master plan

**Horizon:** 24 months, four gates, one deliberate stop at each.
**Default at every gate:** stop. Proceed only on positive evidence, pre-registered before the work starts.
**Ordering principle:** test the cheapest falsifiable claim first. Demand is cheaper to test than buildability; buildability is cheaper than a pilot.

```
GATE −1  Willingness to pay      30 days    ~£2.5k
GATE 0   Buildable + lawful      90 days    ~£6k
GATE 1   One real pilot          6 months   £150–300k
GATE 2   Repeatable + adopted    12 months  £80–200k
```

---

## Gate −1 — Willingness to pay (weeks 0–4)

Added after commercial review. v1 of this plan tested legality and feasibility before testing whether anyone would pay — the expensive way round.

**Spend:** ~£2,500. Retain one ex-bank fraud/compliance operator for 5 days (£2,000); the rest is travel and calls.

**Method:** ten meetings, one two-page note, one ask.

| Segment | Meetings | Why |
|---|---|---|
| Tier-1 banks (fraud ops + compliance) | 4 | Budget exists; cycle is slow and known |
| MMO / PSP | 4 | Design partners; shorter cycles; thinner legal teams |
| Insurers | 2 | The only party with the loss on its own P&L |

The ask is not "what do you think?" It is:

> *"Sign a six-month pilot at £X — or give me the number you would sign at, and the budget cycle that number sits in."*

In parallel, and free: request anonymised coerced-complaint files from three institutions — volume per month, hours to resolve, cost per case. A refusal is itself the finding: you are not yet a trusted data counterparty, and no protocol changes that.

**Pass:** ≥2 signatures, or ≥3 named figures from named budget holders with cycle dates.
**Fail:** zero signatures, or "come back after the next sandbox cohort" from all ten. That is a polite no, and it is the answer.

**If fail:** stop. Do not proceed to Gate 0 hoping a better demo changes a budget line.

---

## Gate 0 — Buildable and lawful (weeks 4–16)

Only run this if Gate −1 passed. **Spend: ~£6,000.**

| # | Track | Deliverable | Why it costs |
|---|---|---|---|
| 0.1 | Legal | Counsel memo: licensing perimeter, lawful basis for inter-bank incident sharing, named hold powers, recipient rights, statutory-reporting boundary, duty-of-care allocation | £2,500–6,000 scoped; five questions, not a survey |
| 0.2 | Institutional | 8–12 discovery interviews: fraud ops, complaints, mobile auth, notification service owner | Time |
| 0.3 | Safety | 3–5 trauma-informed conversations with victim-support practitioners; no recording by default; no identifying detail retained | £300–600 |
| 0.4 | Technical | Staging-replica experiment (below) — **not** a simulator | Bank engineer time, test accounts |
| 0.5 | Positioning | Two-page note; no-refund / no-freeze / no-statutory-duty claims stated plainly | Time |

### 0.4 — the experiment that decides everything

A simulator cannot produce evidence about a bank's alert service, risk engine or wire behaviour, which is where the claim actually lives. So:

- Take **one bank's staging replica** of the production transfer path, in the value band that is PIN-only.
- Run **paired trials**: 5 normal, 5 duress, identical amounts and beneficiaries, across ≥20 participants who each see 5 pairs.
- Pay a **real cash bonus for correct identification**. Unpaid first-time observers cannot detect a motivated, repeating adversary.
- Measure per run: SMS/push arrival time and content, request count, wall-clock, risk-engine verdict, statement-line diff, and whether any participant notices the missing or extra channel.

**Pre-registered kill:** >20% correct detection, **or any measurable difference in alert arrival**, and the claim is dead.

**Why the band matters, restated because it will be pressured:** above the PIN-only band, step-up exists, and a logged bypass flag or a non-arriving OTP is itself the tell. A design that covers high-value transfers requires the bank to falsify its own records. It will not happen.

### Gate 0 criteria — all three

1. A bank mobile-auth **and** notification-service engineer confirm in writing that the band-scoped path is implementable, with no bypass flag and no suppressed alert.
2. Counsel confirms a lawful basis for the sending institution to share a minimal event, **and** names at least one power under which a receiving institution may act.
3. The paired-trial result is below the pre-registered kill threshold.

**If any fails:** stop, or pivot to the accountability-only product (evidence, complaint handling, pattern review). Do not "improve the simulator" and retry.

---

## Phase 1 — One institution (months 4–10)

**Objective:** one real integration, one controlled cohort, measured in minutes and safety incidents.
**Realistic spend: £150,000–300,000.** The v1 figure of £25–60k was off by 4–6×. Breakdown:

| Item | Cost |
|---|---|
| Bank engineer secondment / subsidised integration | £25–45k |
| Build (backend, dashboard, adapter) | £40–80k |
| ISO 27001 / SOC 2 readiness | £20–50k |
| DPA, DPIA, registration, counsel (ongoing) | £15–30k |
| Cyber / E&O insurance | £3–8k |
| Independent penetration test | £10–20k |
| Pilot operations, training, safeguarding review | £15–30k |
| Sales / partnerships (there was none in v1) | £20–40k |

If £150k cannot be raised from a grant, a DFI, or a strategist, the thesis has not convinced anyone with money. That is information, not a false negative — but confirm it at Gate −1, not after spending the build.

**Scope discipline:** one institution, one corridor, one channel, capped value, staff-supervised. The hold rule is **not** in Phase 1.

| Workstream | Deliverable |
|---|---|
| Integration | Durable signed-event queue, mTLS, `(institution_id, event_id)` dedupe, DLQ, replay defence |
| Interaction | Duress PIN enrolment inside the PIN-only band; rotation without a discoverable surface |
| Case workflow | Episode → events → correlation → notify → decide → audit |
| Consent & privacy | DPIA, DPA, retention with destructive delete at closure, DSAR path tested |
| Assurance | Pen test, threat-model review, safeguarding sign-off, breach runbook rehearsed |
| Measurement | Pre-registered metrics; baseline captured *before* launch |

### Metrics

| Counts | Does not count |
|---|---|
| Median minutes from transfer to receiving-institution notice | Number of alerts |
| % of incidents where funds were still available at notice | Number of accounts restricted |
| Time to first human review | "Recovery rate" with no denominator |
| False-activation rate from the cohort | Social-media reach |
| **Unsafe-contact incidents (target: zero)** | NPS |

> "Missed activation rate" is **not measurable** in a live pilot — you only see signals that fire. Measure it once, in the Gate 0 paired-trial study, as a bounded estimate with a stated scenario set, and never quote it as a population rate.

### Gate 1
- Median notice time within target, verified from logs.
- Zero unsafe-contact incidents; any single incident pauses the pilot and triggers independent review.
- **Either** a case where the receiving institution acted and funds were preserved, **or** a documented fast-referral outcome showing human action inside the window. A held-funds case is not required at Gate 1 — the hold rule does not exist yet, and requiring it would be a sequencing fiction.

**Pivot options if Gate 1 fails:**
- **P1a** Accountability-only product: evidence, complaints, pattern review. Smaller, real, sellable.
- **P1b** Corridor-specific control with a bank and an insurer.
- **P1c** Stop.

---

## Phase 2 — Second institution and the hold rule (months 10–18)

1. Second institution on a **different core and auth stack** — proves the protocol is not one bank's internal API.
2. **Hold-rule negotiation**, now legitimate because there is operational evidence. Requirements: named legal power, value cap, duration cap, allocation of liability, recipient-notification rule that protects the sender, and an exit.
3. **IDRS/NIBSS alignment** — propose a duress reason code and SLA inside the existing rail.
4. Governance: safety review board seated with a real veto; protocol published with a change process.

### Gate 2
- Second institution integrated in ≤60% of the first's effort.
- Protocol adopted by a rail participant or formally reviewed by one.
- Cost per case known; a buyer has signed something with a renewal date.

---

## Phase 3 — Industry (months 18–24)

- Rail-level reason code or endorsed field via NIBSS/CBN engagement.
- Regulator anchor: sandbox cohort when open, or a supervisory engagement letter.
- Protocol v1.0 with compatibility policy.
- Two reference deployments and a **published safety report** including incidents.

---

## Revenue paths, ranked by "whose P&L improves"

Ranked by commercial review. Only the first has the loss on the payer's own books.

| # | Path | Why it ranks here | Principal risk |
|---|---|---|---|
| 1 | **Insurer underwrites the peril; you sell signal + evidence to claims** | The payer's loss actually falls when it works | NAICOM product approval 3–6 months; no actuarial data; small retail insurers |
| 2 | **Agent / POS float protection** | Local cash-loss P&L, immediate and countable | Narrow corridor; hardware dependence; agent churn |
| 3 | **White-label via a switch or core vendor** | Instant reach to 30+ banks | You become a feature; 20–30% of value; 18–24 months to revenue |
| 4 | **Diaspora remittance corridor** | Compliance budget exists; "recipient under duress" is a live complaint class | Small ACV; corridor-specific |
| 5 | **Fraud-ops cost-per-complaint triage** (the v1 pitch) | Easiest to explain | Coerced cases are <1% of complaint volume; cannot carry a platform |
| 6 | **Regulator / NIBSS aggregate data** | Real need | No procurement speed; no scale |

**Rejected:** consumer app; per-flagged-transaction pricing at launch (zero volume).

---

## Team sequence

| When | Role | Why |
|---|---|---|
| Gate −1 | Ex-bank fraud/compliance operator (5-day retainer) | Opens doors; makes the ask credible |
| Gate 0 | Nigerian fintech/regulatory counsel (scoped) | Gate 0 depends on the memo |
| Phase 1 | Mobile/auth engineer (contract) | The blocker is auth, not backend |
| Phase 1 | Product designer, safety/accessibility | The interaction *is* the product |
| Phase 1 | Security engineer (pen test, contract) | Bank vendor review demands it |
| Phase 2 | Safeguarding adviser (paid, independent, veto) | Credibility and honest measurement |
| Phase 2 | Partnerships lead | v1 had no sales function at all |

**Not yet:** marketing, ML, blockchain, a CTO.

---

## Risk register

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Duty of care created by shipping the feature | High | High | Allocate explicitly in the pilot contract; no marketing that implies a guarantee | Counsel |
| No budget holder → no revenue | High | Fatal | Gate −1 before any build | Founder |
| Band excludes the highest-risk transfers | High | High | Publish the limitation; do not claim coverage | Product |
| Funds gone before notice | High | High | Standing rule in Phase 2; honest referral framing in Phase 1 | Adviser |
| Coercer is an agent; referral harms victim | Medium | Fatal to trust | Discretionary referral removed; CI assertion; victim-safety precedence | Safety adviser |
| Recipient false positive → legal action | Medium | High | Deferred silent challenge, proportionality log, no labels | Counsel |
| Bank builds it internally | Medium | High | Protocol + cross-institution workflow, not a feature | Founder |
| Budget mis-sizing kills the pilot midway | Medium | High | £150–300k stated up front; grant/DFI path identified before Phase 1 | Founder |
| Rebrand forced by trademark conflict | Medium | Medium | Neutral public handle; clearance before launch | Counsel |
| Data breach exposing victims | Low | Fatal | Minimisation, tenant isolation, no evidence by default, rehearsed runbook | Security |

---

## 90-day checklist

- [ ] Gate −1 run: ten meetings, one ask, pass/fail recorded
- [ ] Anonymised complaint-file requests sent to three institutions
- [ ] Scoped counsel memo commissioned (perimeter, basis, hold powers, recipient rights, duty of care)
- [ ] 10 discovery interviews completed with written synthesis
- [ ] 3 victim-support conversations, consent recorded, no identifying detail retained
- [ ] Staging-replica paired-trial experiment designed and pre-registered (threshold fixed before data)
- [ ] Neutral public handle; repo published with vision, threat model, protocol v0.1, review log
- [ ] One institution names a sponsor **and** an engineer
- [ ] Each gate decision recorded as an ADR, with dissent noted
