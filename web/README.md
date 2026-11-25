# Phylax web

The public design record and the working incident console.

This is **not** a marketing demo. The console authenticates against a real
Postgres database, enforces tenant scoping and role gates, verifies Ed25519
event signatures, and writes an append-only audit chain. The seed data is
synthetic; the flows and guards are the ones the protocol specifies.

## Run locally

```bash
# from the repository root
docker compose up -d

cd web
cp .env.example .env      # then set AUTH_SECRET to a real random value
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev                  # http://localhost:3000
```

Seeded accounts (password `phylax-demo-2026`):

| Role | Email | Can do |
|---|---|---|
| Analyst | `ada.analyst@kite.example.ng` | Read-only — every case mutation requires a supervisor or compliance officer |
| Supervisor | `tunde.supervisor@kite.example.ng` | Correlate, notify, record an action decision, open a recipient challenge, close and assign Kite cases |
| Compliance | `zainab.compliance@kite.example.ng` | Same permissions as supervisor — correlate, notify, action, challenge, close and assign |
| MMO supervisor | `emeka.ops@adaeze.example.ng` | Supervisor in a different tenant — cannot read or mutate Kite cases (404) |

## Verify

```bash
pnpm typecheck
pnpm build
pnpm test        # 26 unit/integration tests, needs the database
pnpm e2e         # 16 browser tests, desktop + mobile
pnpm analytics:prune  # hard-delete telemetry older than 90 days
```

## Routes

| Route | What it is |
|---|---|
| `/` | The public record. Written as a document, not a funnel. |
| `/protocol`, `/safety`, `/assessment`, `/plan`, `/flow`, `/review`, `/sources` | The repository's actual markdown, rendered server-side |
| `/status` | Status ledger, generated from the running database where possible |
| `/console/login` | Institution sign-in |
| `/console` | Case queue |
| `/console/incidents/[id]` | One case: signal, correlation, actions, audit |
| `POST /api/v1/events` | Signed duress-event ingestion (spec v0.1) |
| `GET /api/health` | Liveness and database check |

## Design decisions

Typefaces are locally hosted `.woff2` files, downloaded by
`scripts/fetch-fonts.mjs` (re-runnable). Gloock is the display face, Familjen
Grotesk the interface face, Azeret Mono for protocol data and labels. None are
the default startup fonts. See `docs/design.md` for the rationale.

UI components are vendored from `ui.aceternity.com` by
`scripts/vendor-aceternity.mjs` rather than installed as a package — Aceternity
distributes source. Vendored files carry a header marking them as such and any
local modifications as `PHYLAX`. Re-running the script overwrites local edits,
so patch after vendoring, not before.

## Deployment notes

- `AUTH_SECRET` must be at least 16 random bytes. Sessions are HMAC-signed
  cookies, HttpOnly, SameSite=Lax, Secure in production.
- Set `NEXT_PUBLIC_SITE_URL` to the canonical origin.
- The app requires Postgres. There is no fallback in-memory mode.
- `DATABASE_URL` is mandatory at runtime.
- Telemetry is first-party and writes to `analytics_events` / `web_vitals`.
  There are no third-party analytics keys.
