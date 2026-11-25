# Deployment contract

This is what must be true before anything is pointed at a real institution.
It is written before the work so there is no argument later about what
"ready" meant.

## Environment

Every variable below is required. There are no silent fallbacks in production.

| Variable | Required | Purpose | Failure if absent |
|---|---|---|---|
| `DATABASE_URL` | yes | Postgres connection | Process fails at startup |
| `AUTH_SECRET` | yes, ≥16 random bytes | HMAC for session cookies | Health endpoint reports `missing`; sign-in refuses to start |
| `NEXT_PUBLIC_SITE_URL` | yes, in production | Canonical origin for metadata and redirects | Links and OG tags point at localhost |

Development defaults exist only in code for local scripts (`localhost:5433`) and
must never be relied on in a deployed environment. The health endpoint reports
`auth: missing` when `AUTH_SECRET` is absent or short, and returns HTTP 503.

**Never** place a credential in a repository file, a git remote URL, a
`NEXT_PUBLIC_*` variable, or a log line. The GitHub remote is token-free; CI
uses environment-scoped secrets.

## Staging

A staging environment must exist and be visibly labelled. The console header
already distinguishes `LIVE DATA` from `LOCAL · SEEDED DATA`; a staging
deployment must render `STAGING · SEEDED DATA`, never `LIVE DATA`.

Staging uses synthetic records only. No victim data, no real institution data,
no production key material.

## Database

- Postgres 17. Migrations are applied by `pnpm db:migrate` before the app starts.
- Migration `0000` creates the domain tables; `0001` adds Postgres-backed rate limits.
- Migrations must be forward-applied on a fresh database and verified from the
  previous migration before a deploy.
- `pnpm db:seed` is for local and staging only. It truncates domain tables. It
  must never be run against production.

### Backup and restore

Before first production use, and then on a defined schedule:

1. Take a logical backup: `pg_dump` with a timestamped filename.
2. Restore it into a **fresh** database, not the live one.
3. Apply any migration newer than the backup and run the test suite against it.
4. Record the date, the operator, and the result here.

A backup that has never been restored is not a backup. The rehearsal is a
release gate, not a maintenance task.

| Date | Operator | Result |
|---|---|---|
| _pending_ | | |

## Rollback

1. Redeploy the previous application image. Do not rebuild — use the same
   artifact that was previously running.
2. If the new migration changed schema, apply the documented backwards
   migration. `0001` (rate limits) can be dropped safely. `0000` requires a
   data-aware reversal and must be planned, not improvised.
3. Verify `/api/health`, sign-in, and one case read.
4. Publish what was rolled back and why.

## Logging

Logs are structured and correlated by one request identifier. They contain
action names, object types, reason codes, and timings. They do **not** contain:

- session tokens, cookies, or `AUTH_SECRET`
- PINs, OTPs, biometrics, BVNs, full account numbers
- incident narratives or free text
- full request bodies

The audit table is the authoritative record of decisions. Application logs are
not a substitute for it.

## Analytics retention

First-party telemetry writes to `analytics_events` and `web_vitals`. It stores
page paths and event names, not incident content and not cross-site identifiers.
Retention: **90 days**, then hard delete. The deletion job must be verified
before the first public launch, not added later.

## Release gate

- [ ] CI green on a clean checkout, including Playwright browsers
- [ ] Environment contract verified in staging
- [ ] Staging label visible in the console
- [ ] Backup restored successfully into a fresh database
- [ ] Rollback rehearsed with the previous artifact
- [ ] Logs inspected for secrets and incident content
- [ ] Analytics deletion verified
- [ ] Phase A/B/C findings from `TODO-2.md` all closed
