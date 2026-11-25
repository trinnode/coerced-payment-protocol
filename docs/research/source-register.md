# Source register and verification log

**Method:** primary sources preferred; media used only as incident illustrations; every claim tagged verified / reported / unverified. Verification date: 25 Nov 2026.

---

## Verified in this review

| ID | Source | What it establishes | Status |
|---|---|---|---|
| V1 | CBN, *Press Statement: CBN Launches Cohort 2 of the Regulatory Sandbox Programme*, 11 Aug 2026 (`cbn.gov.ng/Out/2026/CCD/`) | Two tracks: **VASP** and **Data-Enabled Financial Services (Non-VASP)**. Cohort 2 open to innovators, FIs, VASPs, fintechs, tech companies. | Verified (PDF text read) |
| V2 | Cohort 2 application window reporting (Aug 2026) | Applications **12–31 Aug 2026**. Window **closed** as of this review. | Verified via secondary reporting; confirm with CBN before citing |
| V3 | NIBSS, *IDRS (Industry Dispute Resolution Solution)* user guide, updated 6 Mar 2025 | NIBSS operates an inter-bank dispute portal: raising disputes, accept/decline, **representment and arbitration**, **Acquirer Initiated Refund**, settlement reports; participants are banks, NBPs and merchants. | Verified (guide text read) |
| V4 | NIBSS IDRS participant model | Issuer/acquirer/card-scheme vocabulary → IDRS is **card/POS-centric**, not a NIP account-transfer dispute rail. | Inferred from V3; confirm with NIBSS |

**Implication of V3/V4:** there is no existing account-to-account coerced-transfer dispute rail, but there *is* an institutional precedent and an operating vocabulary. A new reason code inside that rail is a more credible long-term path than a new network — and it is a fundamentally different company.

---

## Corrections to playbook v1.0

| Playbook ref | Claim | Correction |
|---|---|---|
| S11 / §5.2 | Sandbox portal, as at 22 Nov 2026, offers a route to apply | Cohort 2 closed 31 Aug 2026. Plan must not depend on an open window. |
| §4.4 | NIBSS standardisation is a "future discussion" | NIBSS already runs IDRS with arbitration. Engage on a reason code, not a network. |
| §5.2 | Sandbox framed as validation | Single-participant testing cannot validate an inter-institutional control. |
| §20.2 | "Missed activation rate" as a pilot metric | Unobservable in live pilots; belongs in the Phase 0 adversarial study as a bounded estimate. |
| §19 | Stage 2 "Simulator" 3–5 weeks | A simulator cannot evidence the bank's alert service or risk engine, where the claim actually lives. Replaced by a staging-replica paired-trial experiment. |

---

## Media incident sources (allegations, not findings)

Retained from the playbook, with the qualification that these are reported allegations:

- Premium Times, 14 Mar 2026 — alleged ₦444,000 checkpoint coercion to a POS account.
- The Guardian, 6 & 15 Sep 2024 — Bayelsa case; officers arrested; funds reportedly returned.
- The Guardian, 5 May 2025 — alleged ₦13m compelled transfers; petitions reported.
- Punch, 24 Mar 2025 — alleged extortion, phone access, station detention.
- Punch, Nov 2026 — Imo allegations; police response reported.

**Use:** scenario design only. **Never:** market sizing, prevalence claims, or beneficiary identification.

---

## Legal instruments to re-verify with counsel

| Instrument | Why it matters | Verification needed |
|---|---|---|
| CBN Regulation on Instant (Inter-Bank) EFT Services, Jul 2018 | Dispute resolution, bank-error vs fraud distinction | Current status; whether amended |
| CBN New Licence Categorisations, Dec 2020 | Whether a software vendor needs a licence | Applicability to a pure processor |
| CBN Operational Guidelines for Open Banking, Mar 2023 | Consent-based data sharing boundaries | Whether incident metadata falls in scope |
| NDPA 2023 + NDPC GAID 2025 | Lawful basis, DPIA, registration, cross-border | Registration threshold for this processing |
| Cybercrimes Act 2015 (as amended 2024) | Evidence preservation and disclosure duties | Institution-specific obligations |
| Police Act 2020 | Complaints Response Unit | Whether any referral duty exists |
| UK PSR APP reimbursement (Oct 2024) | Comparator only — shows liability shift creates budgets | Do not present as Nigerian law |

---

## Research still owed (Phase 0)

1. Ten structured bank/MMO interviews with a written synthesis.
2. Counsel opinion on the four Gate 0 legal questions.
3. Any Nigerian institution that already ships a silent/duress-like interaction (none found publicly — absence of evidence, not evidence of absence).
4. IDRS actual dispute volumes and reason codes — request via NIBSS relationship, not scraping.
5. Trademark/company-name clearance for the working name across NG, WIPO, UK, US.

---

## Honest gaps in this register

- Web search was partially unavailable during this review; V2 relies on secondary reporting and must be confirmed at source.
- No primary victim interviews were conducted. Nothing here should be read as a victim-safety finding.
- No bank has reviewed this document. Every institutional claim is a hypothesis.
