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

- [ ] Exhaustive state-machine test: every state × every illegal transition rejected
- [ ] Concurrency test: two simultaneous actions on one incident produce one outcome
- [ ] Duplicate event storm: same signed event posted 100× concurrently → one incident
- [ ] Key rotation and expiry tested in a running server, not only in a unit test
- [ ] Partial-failure injection: DB down mid-transaction → no half-written incident
- [ ] Audit chain tamper test: altering a row is detected by `verifyAuditChain`
- [ ] Migration forward test from an empty database, and from the previous migration
- [ ] Seed determinism: re-seeding twice produces the same counts and no orphan rows
- [ ] Rate-limit boundary test: 10th request allowed, 11th rejected, across two processes
- [ ] State guard test: closing with a PENDING transaction is refused
- [ ] Cross-tenant test expanded to every read/write endpoint, not just incident lookup
- [ ] Coverage report produced; untested domain branches listed, not hidden

## Phase B — Security

**CLOSED.** All findings fixed; evidence in `docs/evidence/security.md`.

- [ ] Dependency audit (`pnpm audit`) triaged; no known high/critical left unrecorded
- [ ] Session cookie tampering, expiry, and logout invalidation tested
- [ ] CSRF posture reviewed for every mutating route; decision recorded
- [ ] Injection sweep: SQL, JSON, header, path traversal on all inputs
- [ ] Signature edge cases: wrong key, expired key, revoked key, replay, mutated bytes
- [ ] Authorisation matrix: analyst / supervisor / compliance × every mutation
- [ ] Audit chain verified from the running app, not just from a test fixture
- [ ] Secret scan across tree and git history; no credentials anywhere
- [ ] Security headers reviewed against the actual responses
- [ ] Rate limits, body caps, and timeouts verified under load
- [ ] Threat model updated with anything the assessment actually found
- [ ] `SECURITY.md` disclosure path tested (can a reporter reach a human?)

## Phase C — Access, performance, and fidelity

**CLOSED.** All findings fixed; evidence in `docs/evidence/experience.md`.

- [ ] WCAG 2.2 AA pass: keyboard-only path, focus order, labels, live regions, errors
- [ ] Screen-reader pass on queue and incident detail (landmarks, table headers, status text)
- [ ] Reduced-motion pass: no infinite animation, no scroll-linked motion
- [ ] Colour contrast re-measured after the nav and timeline restyle
- [ ] Web vitals collected from real navigations; LCP/INP/CLS recorded, not guessed
- [ ] 390px, 768px, 1440px layout pass with screenshots
- [ ] Every internal link crawled; zero 404s
- [ ] Public copy cross-checked against the assessment and protocol — no claim exceeds the evidence
- [ ] Status ledger still truthful after the hardening work
- [ ] Legal/safeguarding re-read of the public page: any overclaim removed

## Phase D — Deploy readiness

- [ ] CI workflow green on a clean checkout, including Playwright browser install
- [ ] Production env contract documented: every required variable, no silent defaults
- [ ] `AUTH_SECRET` cannot be short or absent in production
- [ ] Database backup and restore rehearsed; a restore actually completed
- [ ] Health endpoint covers DB, auth config, and protocol key freshness
- [ ] Structured logs with request IDs; no secrets or incident content in logs
- [ ] Failure runbook written: DB down, key compromised, victim-data breach
- [ ] Breach protocol rehearsed against the documented life-safety procedure
- [ ] Rollback procedure: previous image + migration backwards
- [x] First-party analytics retention and deletion implemented (`pnpm analytics:prune`, scheduled workflow)
- [ ] A staging environment exists and is visibly labelled

## Phase E — The thing that actually matters

- [ ] Gate −1: ten meetings, one ask, pass/fail recorded
- [ ] If no: stop, and say so publicly
- [ ] If yes: scoped counsel memo commissioned before any build beyond this point

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
