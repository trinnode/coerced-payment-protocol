# Phase B evidence — security assessment

Assessment: `/tmp/opencode/security-report.md` (status FAIL, 4 HIGH / 6 MEDIUM / 2 LOW).
All findings resolved; suite re-run afterwards.

| Finding | Fix | Proof |
|---|---|---|
| Audit hash used app-time `at` but insert used DB time; verifier uncalled and hash unkeyed | Insert `createdAt: new Date(at)`, HMAC-SHA256 with `AUTH_SECRET`, verifier called by `pnpm audit:verify` and CI | `pnpm audit:verify` → `OK bank_kite: 20 entries`; `tests/security.test.ts` tampers a row, detects it, restores it |
| Logout did not revoke; role/tenant read from cookie | `users.sessionVersion`, bumped on logout; `getSession()` re-reads role, tenant and active state from DB every request | `e2e/console.spec.ts` → `logout revokes the session cookie immediately` passes; replay returns 302/401 |
| Seeded password in production HTML | Seed block gated on `NODE_ENV !== "production"` and `SEED_DEMO_ACCOUNTS !== "false"` | Source inspection of `app/console/login/page.tsx` |
| Five mutations committed then returned 503 | Domain functions awaited, route returns `{ok:true}` | `pnpm e2e` → 18/18 pass |
| Cross-tenant assignee | Assignee must be active and in the same institution | `tests/security.test.ts` → E_FORBIDDEN |
| SQL in error body | Generic message + server-side correlation ID | `lib/api.ts` |
| Chunked body-limit bypass | Stream reader counts bytes and cancels at 64 KiB | `tests/security.test.ts` → 429 "Body too large" |
| Pre-auth rate key pollution | One fixed pre-auth bucket; tenant buckets only after signature verification | `app/api/v1/events/route.ts` |
| Unauthenticated telemetry writes | Name/metric allowlist, 8 KiB body cap, 2 KiB props cap, 300/min fixed bucket | `app/api/track/route.ts` |
| Negative amounts | Positive safe-integer check | `app/api/incidents/[id]/route.ts` |
| CSRF / missing headers | Origin check on login form; CSP and production HSTS | `app/api/auth/login-form/route.ts`, `next.config.ts` |

Passed unchanged: dependency audit (no high/critical), secret scan, injection sweep,
Ed25519 protocol checks, production cookie flags, Postgres rate-limit semantics.
