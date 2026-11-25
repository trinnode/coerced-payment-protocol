# Phase A evidence — robustness assessment

Assessment: `/tmp/opencode/robustness-report.md` (status FAIL, 7 open findings).
All resolved; suite re-run afterwards.

| Finding | Fix | Proof |
|---|---|---|
| Concurrent decisions produced two writes and two audit entries | Per-incident `pg_advisory_xact_lock`, conditional `WHERE state = from` update, loser gets 409 | `tests/robustness.test.ts` → exactly one of two concurrent decisions succeeds |
| 12-way duplicate ingest deadlocked | Advisory lock on episode key, `onConflictDoNothing` + reselect, single transaction | `tests/robustness.test.ts` → 12 concurrent ingests, one incident, one raw event |
| Audit rows committed without domain writes | `recordAudit(entry, tx)` shares the caller's transaction everywhere | `pnpm audit:verify` passes after all load tests |
| `E_REPLAY` unimplemented | Compare stored payload hash on duplicate; 409 | `tests/robustness.test.ts` → E_REPLAY |
| Illegal transition returned 5xx | `StateTransitionError extends DomainError`, code E_INVALID_TRANSITION → 409 | `lib/domain/errors.ts`, `lib/api.ts` |
| Analysts could mutate via API | `requireRole("supervisor")` at the API boundary for every mutation; UI read-only for analysts | `pnpm e2e` → analyst role-gate test passes |
| Missing integrity constraints | Unique `(institution_id,event_id)` on raw events; unique `(incident_id,type)` on actions; migration cleans pre-existing duplicates | migration `0003_spicy_silvermane.sql` |

Verified passing by the assessor and re-checked here: all state transitions, closure
guard with PENDING transaction, cross-tenant 404s, double migration, double seed,
Postgres rate-limit counter.

Final suite: `pnpm typecheck` ✓ · `pnpm test` 32/32 · `pnpm e2e` 18/18 ·
`pnpm audit:verify` all chains OK · `pnpm build` ✓.
