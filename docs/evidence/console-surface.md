# Console surface evidence

Four essential product-surface items plus the queue/incident redesign, implemented
without new features beyond the scope. Every mutation stays in the existing
transactional domain layer (`withIncidentTx` + advisory lock), is conditional on
state, tenant-scoped by `institutionId`, and role-gated by `requireRole("supervisor")`
at the API boundary. No hold/freeze/reversal or law-enforcement referral feature
was added. `UNKNOWN` remains first-class everywhere.

## What shipped

1. **Enforced safe-contact state.** `set_contact` (supervisor/compliance) writes
   SAFE / UNSAFE / UNKNOWN with a mandatory reason and an HMAC audit entry.
   `episodes` gained three nullable override columns. The domain rule
   `contactAllowsNotification()` / `assertContactAllowsNotification()` in
   `web/lib/domain/incidents.ts` blocks `notify`, `openChallenge` and
   `releaseChallenge` when contact is UNSAFE. Only an explicit override
   (`override: true`, privileged role, same reason recorded on the episode and
   audit) lifts the block. Setting SAFE/UNKNOWN clears the override.
2. **SLA/escalation clock.** `SLA_AT_RISK_MINUTES = 15` and `slaFor()` live in the
   domain layer; elapsed is occurrence → `notifiedAt`, or occurrence → now while
   notice is pending. The queue and incident page show a ticking clock and an
   `AT RISK` badge (suppressed for CLOSED / REJECTED / RESOLVED). No background job.
3. **Handover notes.** New `case_notes` table (id, incident_id, institution_id,
   author_id, body, reason_code, type, created_at) plus indexes. `add_note` requires
   an active author in the tenant, writes an audit entry, and notes render in the
   incident chronology merged with audit entries. Append-only; no unique key, so
   there were no duplicates to clean up.
4. **Recipient challenge control.** `deferHours` is a user-set integer 0–72,
   validated in the route and domain and audited (including an explicit `0`).
   `release` requires a reason, records `releasedBy` / `releasedAt` on the challenge
   plus an audit entry, and requires an explicit `earlyRelease` confirmation while
   a deferral is active. Deferral is never skipped silently.

**UI review additions:** queue columns are Contact → State → Age first; unsafe open
cases sort to the top; the Unsafe contact statistic is a live filter button; rows
lead with a customer label plus the last four of the case id. At 390 px the same
table becomes stacked cards (case, contact, state, age, amount, receiving) with no
horizontal scroll. The incident page has a one-sentence case-brief band under the
H1 (amount, elapsed clock, receiving institution, contact chip, next required
action), sections ordered Signal → Money exposed → Actions taken (with chronology),
with the action panel first on mobile. Existing `tbody tr` and "Signal" e2e hooks
were preserved.

## Verification (from `web/`)

| Command | Result |
| --- | --- |
| `pnpm db:migrate` | `migrations applied` — new `0004_hesitant_storm.sql`; only PostgreSQL notices about the pre-existing drizzle schema/table |
| `pnpm db:seed` | completed: `{ institutions: '3', incidents: '7', episodes: '6', transactions: '5' }`; NOTICE: truncate cascades to `case_notes` (expected) |
| `pnpm typecheck` | exit 0, no errors (final run) |
| `pnpm test` | 9 test files passed, **48 tests passed**, 1.97 s |
| `pnpm audit:verify` | `OK bank_kite: 109 entries`, `OK mmo_adaeze: 0 entries`, `OK bank_oreva: 0 entries`; exit 0 |
| `pnpm build` | compiled successfully; all console and API routes present in the route table |

`web/tests/console-surface.test.ts` covers safe-contact blocking/override, UNKNOWN
preservation, note creation and tenant/author guards, deferral bounds, explicit
early release, SLA calculation, and route-level role (403) and tenant (404) guards.

**Not run:** full Playwright e2e. Port 3000 was free at check time, but other
agents may start/use it; per the engagement rule the full suite was skipped rather
than risk interfering. No process on port 3000 was killed.

## Migration note

`web/drizzle/0004_hesitant_storm.sql` is the only new migration. 0000–0003 were
left untouched. It creates `case_notes`, adds two `challenges` release columns and
three `episodes` override columns, with matching FKs and indexes. No unique
constraint was introduced, so no duplicate cleanup statement was needed.
