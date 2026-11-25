# TODO 2 — Hardening, evidence, and deploy readiness

This is the second book of work. The first ended with a working public record,
a working console, and a clean QA pass. This one exists to answer a harder
question: **would we be comfortable pointing this at a real institution?**

Rule: nothing here is "done" because it was written down. Done means a test,
a scan, or an observed behaviour, with the evidence recorded.

Default at the end of each phase: fix what was found, re-run the whole suite,
then move on. Do not start Phase D with an open Phase A/B/C finding.

---

## Phase A — Robustness and test depth

**CLOSED.** All findings fixed; evidence in `docs/evidence/robustness.md`.

- [x] Exhaustive state-machine test: every state × every illegal transition rejected
- [x] Concurrency test: two simultaneous actions on one incident produce one outcome
- [x] Duplicate event storm: same signed event posted 100× concurrently → one incident
- [x] Key rotation and expiry tested in a running server, not only in a unit test
- [x] Partial-failure injection: DB down mid-transaction → no half-written incident
- [x] Audit chain tamper test: altering a row is detected by `verifyAuditChain`
- [x] Migration forward test from an empty database, and from the previous migration
- [x] Seed determinism: re-seeding twice produces the same counts and no orphan rows
- [x] Rate-limit boundary test: 10th request allowed, 11th rejected, across two processes
- [x] State guard test: closing with a PENDING transaction is refused
- [x] Cross-tenant test expanded to every read/write endpoint, not just incident lookup
- [x] Coverage report produced; untested domain branches listed, not hidden

## Phase B — Security

**CLOSED.** All findings fixed; evidence in `docs/evidence/security.md`.

- [x] Dependency audit (`pnpm audit`) triaged; no known high/critical left unrecorded
- [x] Session cookie tampering, expiry, and logout invalidation tested
- [x] CSRF posture reviewed for every mutating route; decision recorded
- [x] Injection sweep: SQL, JSON, header, path traversal on all inputs
- [x] Signature edge cases: wrong key, expired key, revoked key, replay, mutated bytes
- [x] Authorisation matrix: analyst / supervisor / compliance × every mutation
- [x] Audit chain verified from the running app, not just from a test fixture
- [x] Secret scan across tree and git history; no credentials anywhere
- [x] Security headers reviewed against the actual responses
- [x] Rate limits, body caps, and timeouts verified under load
- [x] Threat model updated with anything the assessment actually found
- [x] `SECURITY.md` disclosure path tested (can a reporter reach a human?)

## Phase C — Access, performance, and fidelity

**CLOSED.** All findings fixed; evidence in `docs/evidence/experience.md`.

- [x] WCAG 2.2 AA pass: keyboard-only path, focus order, labels, live regions, errors
- [x] Screen-reader pass on queue and incident detail (landmarks, table headers, status text)
- [x] Reduced-motion pass: no infinite animation, no scroll-linked motion
- [x] Colour contrast re-measured after the nav and timeline restyle
- [x] Web vitals collected from real navigations; LCP/INP/CLS recorded, not guessed
- [x] 390px, 768px, 1440px layout pass with screenshots
- [x] Every internal link crawled; zero 404s
- [x] Public copy cross-checked against the assessment and protocol — no claim exceeds the evidence
- [x] Status ledger still truthful after the hardening work
- [x] Legal/safeguarding re-read of the public page: any overclaim removed

## Phase D — Deploy readiness

- [x] CI workflow green on a clean checkout, including Playwright browser install
- [x] Production env contract documented: every required variable, no silent defaults
- [x] `AUTH_SECRET` cannot be short or absent in production
- [x] Database backup and restore rehearsed; a restore actually completed
- [x] Health endpoint covers DB, auth config, and protocol key freshness
- [x] Structured logs with request IDs; no secrets or incident content in logs
- [x] Failure runbook written: DB down, key compromised, victim-data breach
- [x] Breach protocol rehearsed against the documented life-safety procedure
- [x] Rollback procedure: previous image + migration backwards
- [x] First-party analytics retention and deletion implemented (`pnpm analytics:prune`, scheduled workflow)
- [x] A staging environment exists and is visibly labelled

## Phase E — The thing that actually matters

- [x] Gate −1: ten meetings, one ask, pass/fail recorded
- [x] If no: stop, and say so publicly
- [x] If yes: scoped counsel memo commissioned before any build beyond this point

---

## Agents

| Agent | Scope | Mode |
|---|---|---|
| Security assessment | Phase B | Read-only assessment; reports findings |
| Robustness QA | Phase A | Read-only assessment; reports findings |
| Experience assessment | Phase C | Read-only assessment; reports findings |

Agents do not fix. Fixes are applied here, then re-verified with the full suite.

Evidence from each pass is kept in `docs/evidence/`, written by the maintainer,
not by the agents. Reports that are only in a chat log do not count.
