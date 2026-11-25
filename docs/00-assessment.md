# 00 — Assessment: what survives contact with reality

**Status:** adversarial review of *Phylax Financial Safety Infrastructure Playbook v1.0* (22 Nov 2026)
**Method:** first-principles deconstruction, incentive analysis, verification against primary sources, and kill-criteria design.
**Verdict up front:** the *problem* is real and under-served. The *product as specified* is aimed at the wrong half of the problem, has no P&L owner inside the buyer, and contains one unresolved technical blocker that decides whether the whole thing works. It is worth pursuing — but as a protocol-and-controls play, not a case-management platform.

---

## 1. Scores

| Dimension | Score | Note |
|---|---|---|
| Problem definition | 9/10 | Precise, honest, unusually well-bounded. |
| Evidence discipline | 8/10 | Correctly refuses to invent prevalence numbers. Weak on primary verification. |
| Regulatory reading | 5/10 | Right instincts, stale and incomplete on the sandbox, silent on the real blocker. |
| Technical feasibility | 4/10 | The activation path is hand-waved where it matters most. |
| Commercial logic | 3/10 | No incentive owner, no liability shift, no quantified buyer pain. |
| Safety/privacy design | 7/10 | Strong principles, one serious hole (the accused recipient). |
| Scope discipline | 3/10 | MVP is a platform. It should be a memo, a simulator and a pitch. |
| **Overall readiness to build** | **4/10** | Build the *proof*, not the *platform*. |

---

## 2. The five things that can kill this

### K1. There is no P&L owner for the loss (commercial kill)

A transfer the customer authorised under coercion is, in most Nigerian retail banking practice, **the customer's loss, not the bank's**. Fraud-reimbursement liability in Nigeria has not been shifted onto sending institutions the way the UK's PSR requirement did from October 2024. That UK rule is what created a budget line, a reporting obligation, and an appetite for shared infrastructure.

Without a liability shift, the internal buyer for Phylax is **CSR, brand, or regulator-relations** — historically the weakest budget in a Nigerian bank, and the first to be cut. "Customer trust" does not survive a procurement committee against "cost per case" and "integration risk".

**Consequence:** the honest pitch is not "reduce fraud losses". It is either (a) *reduce cost-per-complaint and regulatory exposure*, or (b) *win a specific segment where the institution does bear the loss* — insurers underwriting the peril, or agent-float books, not tier-1 banks.

**And the deeper problem is legal, not commercial.** Absence of a reimbursement rule is not absence of liability. A bank that ships and markets a duress control creates a duty of care it did not previously have; failing to act on a signal it solicited is negligence. That is the strongest single reason a bank's counsel says no, and the pilot contract must allocate it explicitly rather than the deck ignoring it.

**Test before building:** can you get one fraud-operations head to say, on the record, "this would remove X hours per case" or "this reduces our exposure to Y"? If not, stop. The cheaper test — will anyone name a number and a budget date — is Gate −1.

### K2. The OTP contradiction (technical kill)

The playbook treats activation as a UX choice. It is a **systems** problem, and the playbook never confronts it:

> In a Nigerian bank app, a transfer is typically completed by a step-up factor — an OTP delivered by SMS or push to the same phone the coercer is holding, a transaction-PIN re-entry, or a device-bound token.

So the duress path must (1) authenticate the *duress* credential, (2) complete the *real* transfer, and (3) produce a **visually and temporally identical** experience to a normal transfer — no different spinner, no different receipt, no different balance update — while (4) surviving a coercer who watches the OTP arrive. If the design requires an OTP the attacker can read, the duress signal is decorative. If the duress path silently skips step-up, the coercer notices the missing step.

This is the actual IP. It requires a **device-bound silent authorisation path** the bank controls. No SDK sold to a bank solves it; only the bank's own authentication stack can.

**Correction (engineering review, v2):** the "decoy receipt / decoy ledger surface" idea in v1 is **incoherent and is withdrawn**. The debit alert, balance movement and statement line are emitted by the notification service off core-banking posting — *below* the app and outside the auth path. Suppressing the alert is itself a louder signal than any spinner (the transfer completed and nothing arrived); faking a balance means telling a customer a false balance, which no bank will do. And a step-up *exemption* is recorded by the policy engine as a bypass flag, visible in the audit trail and any subject-access export — so the mechanism fails on the second use by an attacker who is paying attention.

**What survives, and it is narrower and more honest:**

> Run the duress path **inside a value band where the normal flow is already PIN-only**. Then the duress request and the normal request are byte-identical at the edge: no step-up exemption exists, nothing is suppressed, and the balance, alert and statement line are all real. The only divergence is a **control-plane notice** to the sending institution's fraud operations.

That also settles biometrics: `BiometricPrompt`/`LAContext` return a boolean plus modality — there is no duress finger. The credential must be a second PIN hash verified at the same prompt, which requires the band to be PIN-authenticated for normal customers too. Any other design leaks.

**Consequence:** Phylax cannot be a vendor that ships "duress detection" or "silent transfers". It ships *the interaction design, the band selection, the control-plane notice and its adversarial validation* — and it must be co-designed with the bank's mobile, auth and notification teams. Hiding the *signal* works. Hiding the *money* does not.

### K3. The value decays in minutes (product kill)

Fund preservation is a race against cash-out. NIP credits are instant; a POS agent can disburse cash within minutes. Meanwhile the playbook's own operating model — case creation, human review, inter-bank notification, legal sign-off, three-working-day dispute window — operates on a **hours-to-days** clock.

A case-management console that produces a well-audited record of money that has already left is *compliance theatre*. It is not worthless (evidence, complaints, pattern detection), but it is not the promise on the tin.

**Consequence:** either the product creates a **pre-credit hold window** on the receiving side, or it must be honest that it is an *after-the-fact accountability* tool. Pick one. Do not claim both.

And if it is a hold, name the power. "A recorded legal basis" is not a legal basis. The candidate instruments are a contractual lien or right of set-off, a Post-No-Debit instruction, the CBN Consumer Protection Regulations 2022, or an ex parte injunction — each with different latency, different approval chain, and different exposure. Until one is named and its approval chain documented, the hold cannot be built, and the 10-minute target is fiction.

### K4. The signal can summon the coercer's colleagues (safety kill)

The best-documented Nigerian pattern is coercion by security agents at checkpoints. If a duress event routes into a bank's fraud workflow, the ordinary next step is a police report — the exact institution the victim is fleeing from. The playbook lists "police officer is alleged coercer" as one edge case among twenty-three. Operationally it is the *modal* case in the public record.

**Consequence:** "no automatic law-enforcement referral" must be an architectural invariant with a test in CI, not a principle in a PDF. And the victim must control referral, not merely consent at enrolment.

### K5. The accused recipient has rights too (legal/ethical kill)

Every architecture in the playbook treats the *beneficiary* as a data object. In NDPA terms they are a data subject. If a bank restricts an account because a third-party platform sent an allegation, the recipient has a lawful interest in notice, challenge and correction — and a defamation exposure sits behind any informal disclosure.

**Consequence:** the data model needs a **recipient-response workflow** (challenge, correction, release) from day one. Absent that, a DPIA will not clear, and the first false positive becomes a lawsuit and a news story.

There is also a precedence problem the playbook never resolves: a recipient challenge notifies the account holder that a report exists. If that recipient is the coercer or connected to them, the notification *is* the retaliation. **Victim safety outranks notice**: challenge is available, but silent and deferred until the sending institution clears it.

---

## 3. Factual corrections to the playbook

| # | Playbook claim | Verified position | Why it matters |
|---|---|---|---|
| C1 | Sandbox Cohort 2 portal "as at 22 November 2026" offers a route to apply. | Cohort 2 launched 11–12 Aug 2026 with a **window closing 31 Aug 2026**. As of Nov 2026 the window is closed; next cohort timing unannounced. | The regulatory strategy rests on a route that is not currently open. Plan for a cohort-independent path (direct engagement + pilot under bank sponsorship) in parallel. |
| C2 | "Future standardisation discussion" with NIBSS (S4.4). | NIBSS already runs **IDRS** — an inter-bank dispute portal with issuer/acquirer roles, representment, arbitration and Acquirer-Initiated Refund. | Architecture B partly re-implements existing rail infrastructure. The realistic target is a **new dispute reason code + SLA inside the existing rail**, not a new network. |
| C3 | Sandbox is presented as a validation vehicle. | Sandbox tests a *single* participant under limits; the core risk here is **inter-institutional**. | A sandbox admission would not test the thing that matters. It is a credibility token, not a validation path. |
| C4 | Dispute resolution "within three working days" framed as a live option. | Correct as a rule, but the 2018 instant-EFT framework distinguishes bank-error reversals from fraud; a coerced-but-authorised transfer does not fit either cleanly. | Do not build a product whose value case depends on that three-day path. |
| C5 | Prior-art review deferred. | A 2025 preprint on duress-enabled mobile banking exists and is directly adjacent. | Novelty must be claimed on *institutional operating model + silent-authorisation pattern*, never on "duress PIN". |
| C6 | "Decoy receipt/balance" implied as the concealment mechanism (§K2 v1, §10.2). | Incoherent: alerts, balances and statement lines are emitted below the app. Suppression is louder than disclosure. | Conceal the *signal*, never the *transfer*. Withdrawn in v2. |
| C7 | I6 ("a recorded legal basis before any hold") coexisting with a <10-minute target. | A human legal-basis record takes 20–60 minutes, worse out of hours. The two requirements cannot both hold. | Pre-authorised standing rules replace per-case legal sign-off, or the claim is a *fast referral*, not a hold. |
| C8 | "A coerced payment is a transfer a person authorises but does not consent to." | Duress **vitiates** consent; the mandate is defective. The original phrasing concedes exactly what the bank's counsel will argue. | Say "appears to be authorised, but is not freely given". |
| C9 | No liability shift ⇒ commercial problem only. | Inverted. A bank that ships and markets a duress control **acquires a duty of care it did not have**. Ignoring a signal it solicited is negligence. | This is the primary legal objection, and it must be answered in the pilot contract, not in a slide. |
| C10 | Phase 0 spends ~£3.5k proving buildability and legality. | Both are expensive and slow; neither tests **willingness to pay**, which is cheaper and more decisive. | Add a 30-day, ~£2.5k commercial falsification gate *before* Gate 0. |
| C11 | Phase 1 at £25–60k. | Omits ISO 27001/SOC 2 (£20–50k), DPA (£5–15k), cyber/E&O (£3–8k), subsidised bank engineer (£25–45k), and any sales cost. | Realistic first-revenue cost is **£150–300k**, against a 12–18 month cycle and an Oct–Dec budget-setting window. |
| C12 | MMO/PSP as first customer. | Conflates **design partner** with **revenue base**. MMOs share less, have thinner legal teams, and a third of the ACV. | MMO = design partner. Insurer or agent-float = the payer with the loss on its own P&L. |

---

## 4. What the playbook gets genuinely right — protect these

1. **Boundary discipline.** Bank authority, no auto-freeze, no platform-initiated debit, no blacklist. This is the single reason a bank's legal team will take the meeting. Do not erode it under pressure to look impressive.
2. **Epistemic hygiene.** "Allegation ≠ finding"; "signal ≠ proof ≠ verdict"; refusing to invent prevalence numbers. Rare and valuable.
3. **Many-to-many incident↔transaction model.** Correct, and most designs get this wrong by collapsing an episode into one amount.
4. **Notification suppression as a first-class state.** The safe-contact suppress flag is the most safety-critical field in the entire schema. Keep it.
5. **Refusal of blockchain and AI adjudication.** Correct on both privacy and authority grounds.
6. **The closing note.** "The aim is not to create a private authority over people's bank accounts." That sentence should be in the README verbatim.

---

## 5. Determinations

| # | Question | Determination |
|---|---|---|
| D1 | Build the platform now? | **No.** Build the protocol spec, the adversarial test protocol, and the commercial gate. Platform follows a signed pilot. |
| D2 | Who is the first customer? | **Two different roles, two different parties.** A licensed MMO/PSP is the *design partner* (short cycles, owns both sides). The *payer* is an insurer underwriting the peril, or an agent-float book, because those are the only parties with the loss on their own P&L. Do not confuse them again. |
| D3 | What is the product? | **A band-scoped silent-authorisation pattern + a control-plane notice + an incident record.** Case management is table stakes. A hold protocol is out of scope until a standing rule exists. |
| D4 | What is the moat? | Threat-validated interaction design, band selection, bank-side auth integration know-how, and a published protocol NIBSS could adopt. Not the PIN idea. |
| D5 | What is the public artefact? | Vision, threat model, event protocol, safety principles, the assessment, and the review log. **Withhold:** pilot design, victim research, commercial terms, bank procedures. |
| D6 | What is the first milestone? | Not a simulator. **One named budget holder naming a number and a budget-cycle date.** |
| D7 | Name? | Keep **PHYLAX** as a working name only. PHYLAX is crowded in security and pharma. Publish under a neutral repo handle until cleared. |
| D8 | Gate order? | **Gate −1 (willingness to pay, 30 days) → Gate 0 (buildable + lawful) → Gate 1 (pilot).** Testing buildability before demand is how technical founders spend a year building something nobody buys. |
| D9 | Is this venture-fundable? | **Not today.** No sizeable market, no LOI, no partner. It is a grant/DFI/PPP play, or a feature NIBSS should own. The venture story only exists as a broader fraud-signal layer, which the scope discipline forbids. Say this out loud. |

---

## 6. The uncomfortable summary

The playbook is a very good *problem* document wearing the costume of a *product* document. Its discipline about what the platform must not do is what makes it credible; its ambition about what the platform will do is what makes it unbuildable.

Three independent adversarial reviews (regulatory/safeguarding, bank mobile-auth engineering, commercial) converged on four conclusions, recorded in [`04-review-log.md`](04-review-log.md):

1. The concealment design was incoherent — conceal the signal, never the transfer.
2. The bank acquires a duty of care by shipping this; that, not willingness-to-pay, is the primary legal obstacle.
3. Willingness to pay is untested and cheaper to test than buildability. Test it first.
4. This is not a venture-scale business today. It is a grant/PPP play or a rail feature.

The instruction is not "build a smaller version of this". It is:

> **Sell one signal before you build one. Then prove one interaction is safe, in one institution, under observation — then earn the right to build the rest.**

Everything in `01-master-flow.md` and `02-master-plan.md` is sequenced around that sentence.
