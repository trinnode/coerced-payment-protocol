# Build TODO

Legend: `[ ]` pending · `[~]` in progress · `[x]` done and verified

## 0. Foundations
- [x] Scaffold Next.js 16 + React 19 + TS 7 + Tailwind v4 in `web/`
- [x] Download uncommon fonts as `.woff2` (Zodiak, Familjen Grotesk, Azeret Mono)
- [x] Design tokens: colour, spacing, type scale, motion, reduced-motion path
- [x] `lib/utils.ts`, design system in `globals.css`
- [x] Postgres 17 via docker compose, Drizzle schema + migration applied

## 1. Aceternity component layer
- [x] Vendor 20 components from ui.aceternity.com registry into `web/components/ui/`
- [x] Header: Aceternity `resizable-navbar` + mobile nav
- [x] Footer: in-idiom oversized wordmark + link grid (Aceternity ships no footer component)
- [x] Backgrounds: `spotlight-new` on the opening
- [x] Surfaces: `tracing-beam` for the three loops, `timeline` for the gates
- [x] Restyled vendored files to project tokens; removed Tailwind v3-only classes

## 2. Data layer
- [x] Schema: institutions, keys, users, episodes, incidents, transactions, actions,
      challenges, audit, analytics, vitals
- [x] Seed: 3 institutions, 4 users, 6 episodes, 7 incidents — includes a declined
      action, an UNKNOWN correlation and a late delivery
- [x] Repository layer scopes every query by the session's institution

## 3. Protocol API (spec v0.1)
- [x] Ed25519 signature verification with raw-message verification (correct algorithm)
- [x] JCS-style canonical JSON with fixtures
- [x] `POST /api/v1/events`: schema, forbidden fields, future-dated check, dedupe on
      `(institution_id, event_id)`, 202 `RECEIVED_NOT_VERIFIED`
- [x] Postgres-backed rate limits (10/min + 50 burst), 64kB body cap, key expiry and revocation
- [x] Incident mutation API with role gates and mandatory authority references
- [x] First-party telemetry (`/api/track`) and health endpoint

## 4. Console
- [x] Sign-in (scrypt + HMAC-signed cookie), roles analyst/supervisor/compliance
- [x] Queue with state, band, amount, receiving institution, contact flag, live age
- [x] Incident detail: chronology, correlation, actions, challenges, audit chain
- [x] Authority reference required for every action decision
- [x] Recipient challenge is deferred by default; closure destroys incident detail
- [x] Real empty/loading/error states

## 5. Public site
- [x] Landing: human-written document structure, not a product template
- [x] Documents rendered from the repository's actual markdown (10 routes)
- [x] Status ledger generated from the running database
- [x] Honest limitations and refusals stated before any call to action

## 6. Tracking + QA
- [x] Vitest: 26 tests — canonicalisation, envelope, state machine, tenant isolation,
      signed ingestion, idempotency, key revocation
- [x] Playwright: 16 tests across desktop and mobile — includes keyboard-enter login — public pages, docs, login,
      cross-tenant denial, role gate, protocol rejection
- [x] `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm e2e` all pass
- [x] Phase B QA agent: all 10 must-fix findings applied and re-verified

## 7. Ship
- [x] `web/README.md` run/deploy instructions
- [x] Record design rationale (`docs/design.md`)
- [x] Published to github.com/trinnode/coerced-payment-protocol
- [ ] Re-run Gate −1 question with ten named institutions (not software work)
