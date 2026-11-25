# Evidence — role and access-control matrix

Date: 2026-11-25. Scope: `web` incident console. Seed password `phylax-demo-2026`.
No seeded case was mutated: each write test created its own episode + incident
through direct SQL and deleted it in `afterAll`. Re-seeding was not necessary.
Revocation fixtures are per-Playwright-worker (`TEST_WORKER_INDEX`) so the two
projects cannot invalidate each other's cookies.

## What was verified

| Check | Result |
|---|---|
| Analyst sees the queue; all six intents (`correlate`, `notify`, `action`, `challenge`, `close`, `assign`) return 401/403 and leave state, transactions, actions, challenges, assignment, closure and audit counts byte-identical | PASS |
| Supervisor: correlate → notify → action → challenge on one case; close on a second (NOTIFIED) case; assign on a third | PASS (all 200, expected states) |
| Compliance: identical six-intent matrix and expected states | PASS |
| MMO supervisor: GET Kite case → 404, no case fields in body; POST notify → 404 `E_NOT_FOUND`, no case id/state/customer in body; Kite case absent from MMO queue; case unchanged | PASS |
| Mutation with no cookie → 401 `E_UNAUTHENTICATED` | PASS |
| Logout: old cookie replayed on GET → redirect/401; replayed on POST → 401 | PASS |
| DB `session_version + 1`: old cookie replayed on GET → redirect/401; replayed on POST → 401; fresh login succeeds | PASS |
| `atLeast` rank order; role re-read from DB (forged cookie claim is ignored); inactive user and stale version rejected; tampered/expired HMAC cookie rejected | PASS |
| `E_FORBIDDEN=403`, `E_INVALID_TRANSITION=409`, `E_STATE_GUARD=409`, `E_UNAUTHENTICATED=401`, `E_NOT_FOUND=404`; `fail(DomainError)` and `fail(StateTransitionError)` return them | PASS |

## Commands and results

Run from `/home/trinnex/Documents/CodeBase/personalProjects/phylax/web` unless
stated otherwise.

```console
$ pnpm typecheck
> tsc --noEmit
TYPECHECK_EXIT=0
```
Result: clean, no diagnostics.

```console
$ pnpm test
 Test Files  9 passed (9)
      Tests  48 passed (48)
TEST_EXIT=0
```
Includes `tests/roles.test.ts`: 10/10 passing (7 role/session, 3 error mapping).
An earlier run failed with `column episodes.contact_override_by does not exist`
in `tenant.test.ts` / `ingest.test.ts` while a concurrent agent had edited
`lib/db/schema.ts` ahead of migration `0004_hesitant_storm.sql`; after that
migration was applied the full suite passed unchanged.

```console
$ pnpm e2e --grep roles
> playwright test --grep roles
[WebServer] ⨯ Another next dev server is already running.
[WebServer] - Local: http://localhost:3008
Error: Process from config.webServer was not able to start. Exit code: 1
E2E_EXIT=1
```
Port 3000 was free, but Next 16 refuses a second dev server for the same
project directory: another agent's `next dev -p 3008` held the project lock.
Per instruction, that server was **not killed**. Instead an out-of-tree runner
was used against the already-running server (health check 200):

`/tmp/opencode/web-roles/playwright.config.ts` (outside the repository) sets
`baseURL: http://localhost:3008`, `testMatch: "roles.spec.ts"`,
`reuseExistingServer: true`, and both `chromium` and `mobile` projects.

```console
$ cd /tmp/opencode/web-roles
$ ./node_modules/.bin/playwright test --config playwright.config.ts --grep roles
Running 14 tests using 2 workers
  ✓ 7 × [chromium] › e2e/roles.spec.ts › roles › …
  ✓ 7 × [mobile]    › e2e/roles.spec.ts › roles › …
  14 passed (15.8s)
E2E_EXIT=0
```
The first run of this command had one failure in the cross-tenant test: the
Next.js dev 404 page embeds the requested URL (hence the incident id) in its
RSC flight payload. The assertion was corrected to ignore the echoed URL while
still forbidding case-owned fields (`cust_roles`, `CORRELATED`,
`SUSPECTED_DURESS`, `PIN_DURESS_ENTRY`). All 14 then passed.

## Notes / inconsistencies

- `web/README.md` role rows now match the observed API behaviour. Previously
  "Supervisor / Compliance: all of the above + action decisions" inherited the
  analyst row's old `correlate, notify, challenge, close` claim.
- Source observation (concurrently fixed by another agent, not by this worker):
  `requireRole`/`requireSession` originally threw plain `Error`, which `fail()`
  mapped to 500 `E_UNAVAILABLE` instead of 403/401. They now throw
  `DomainError`; the unit tests assert the corrected codes and statuses.
- Not fixed (file outside the allowed set): `app/api/incidents/[id]/route.ts`
  still contains an unreachable `if (session.role === "analyst") return
  fail(new Error("E_FORBIDDEN"))` in the `action` branch and a redundant
  `try/catch` that rethrows `E_FORBIDDEN` around `requireRole`. Both are dead
  code today; if reached, the plain `Error` would again map to 500.
- `close` is correctly rejected from `ACTION_ACCEPTED` and
  `RECIPIENT_CHALLENGE` by the state machine, so the close test uses a fresh
  `NOTIFIED` case rather than forcing an illegal transition.
