# Second wave evidence

Five assessors and three fixers. All findings resolved; suite re-run after each batch.

| Agent | Verdict | Resolution |
|---|---|---|
| Stress/load | PASS WITH FIXES | Locked dual-minute, non-consuming rate limiter in `lib/rate-limit.ts`; 413 body cap confirmed |
| UI design | NEEDS REDESIGN | Ledger promoted, Spotlight removed, speed markers enlarged, `/protocol` masthead; queue/incident story redesigned by console fixer |
| Secure code + structure | PASS WITH FIXES | 401/403/409/413 mapping, redacted event errors, removed `as never` paths via domain validation, login deduplicated, CI capability scan |
| Product/UX | COHERENT WITH CHANGES | Staging label added, overclaims removed, synthetic-data caveat on console stats, four essential console surfaces built |
| General engineer | PASS WITH FIXES | Telemetry 204 body fixed, challenge release no longer strands a case, seed guard added, audit verification paginated, journal staged atomically |

Measured after resolution:

- 100 concurrent duplicate signed events → 1 incident, 1 raw event, no deadlocks.
- 260 concurrent unsigned junk requests → 0×5xx, bounded rate-limit rows.
- 10MB chunked body → 413 in 15ms.
- 32 browser tests across desktop and mobile, including a seven-test role matrix:
  analyst read-only with every intent denied, supervisor/compliance full mutation,
  cross-tenant denial, unauthenticated 401, logout replay, DB demotion.
- 49 unit/integration tests, including replay, concurrency, role codes, audit tamper,
  challenge lifecycle and console safety surface.
- `pnpm audit:verify` verifies the entire chain by cursor, not a 500-row cap.
