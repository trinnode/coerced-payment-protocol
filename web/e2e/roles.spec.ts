import { expect, test, type Page } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

loadEnv({ path: new URL("../.env", import.meta.url).pathname });

/**
 * Direct database access is used only to create isolated fixtures and to read
 * state back after a rejected mutation. Every access decision is exercised
 * through the real HTTP API with a real signed session cookie.
 */
const sql = postgres(process.env.DATABASE_URL ?? "postgres://phylax:phylax@localhost:5433/phylax", {
  max: 4,
  prepare: false,
});

const PASSWORD = "phylax-demo-2026";
const KITE = "bank_kite";
const MMO = "mmo_adaeze";
const ANALYST = "ada.analyst@kite.example.ng";
const SUPERVISOR = "tunde.supervisor@kite.example.ng";
const COMPLIANCE = "zainab.compliance@kite.example.ng";
const MMO_SUPERVISOR = "emeka.ops@adaeze.example.ng";
const DENIED = [401, 403];
// The two Playwright projects run in parallel workers; keep revocation
// fixtures distinct so one worker's sessionVersion bump cannot invalidate the
// other worker's cookie.
const WORKER = process.env.TEST_WORKER_INDEX ?? "0";

const createdIncidents: string[] = [];
const createdEpisodes: string[] = [];

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  for (const id of createdIncidents) await sql`delete from incidents where id = ${id}`;
  for (const id of createdEpisodes) await sql`delete from episodes where id = ${id}`;
  await sql.end();
});

async function signIn(page: Page, email: string) {
  await page.goto("/console/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Enter console" }).click();
  await expect(page).toHaveURL(/\/console$/);
}

async function cookieHeader(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

/** A brand-new case per test, so no parallel test mutates a seeded case. */
async function freshCase(state: string, correlation: string): Promise<string> {
  const episodeId = randomUUID();
  const incidentId = randomUUID();
  await sql`insert into episodes (id, institution_id, external_episode_id, customer_ref, contact_state)
    values (${episodeId}, ${KITE}, ${`roles-${episodeId}`}, ${"cust_roles"}, 'UNKNOWN')`;
  await sql`insert into incidents
    (id, institution_id, episode_id, event_id, state, event_type, activation_method,
     activation_confidence, band, occurred_at, correlation)
    values (${incidentId}, ${KITE}, ${episodeId}, ${randomUUID()}, ${state}, 'SUSPECTED_DURESS',
      'PIN_DURESS_ENTRY', 'BANK_AUTHENTICATED', 'PIN_ONLY_TIER_1', now(), ${correlation})`;
  createdIncidents.push(incidentId);
  createdEpisodes.push(episodeId);
  return incidentId;
}

async function userId(email: string): Promise<string> {
  const [row] = await sql`select id from users where email = ${email}`;
  if (!row) throw new Error(`Missing seeded user ${email}`);
  return row.id;
}

/** Isolated user for revocation tests: bumping its version cannot disturb another agent. */
async function ensureUser(email: string, role: "analyst" | "supervisor") {
  const [hash] = await sql`select password_hash from users where email = ${ANALYST}`;
  await sql`insert into users (institution_id, email, name, role, password_hash, active, session_version)
    values (${KITE}, ${email}, 'Role test', ${role}, ${hash.password_hash}, true, 0)
    on conflict (email) do update set
      role = excluded.role, active = true, password_hash = excluded.password_hash`;
}

type Snapshot = Record<string, unknown>;

async function snapshot(id: string): Promise<Snapshot> {
  const [r] = (await sql`select state, correlation, correlation_note, receiving_institution_id,
    notified_at, action_status, assigned_to, closed_at, close_reason
    from incidents where id = ${id}`) as Array<Record<string, unknown>>;
  if (!r) throw new Error("Fixture incident disappeared");
  const [audit] = (await sql`select count(*)::int as n from audit_events where object_id = ${id}`) as Array<{ n: number }>;
  const [actions] = (await sql`select count(*)::int as n from actions where incident_id = ${id}`) as Array<{ n: number }>;
  const [challenges] = (await sql`select count(*)::int as n from challenges where incident_id = ${id}`) as Array<{ n: number }>;
  const [txns] = (await sql`select count(*)::int as n from transactions where incident_id = ${id}`) as Array<{ n: number }>;
  const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
  return {
    state: r.state,
    correlation: r.correlation,
    correlationNote: r.correlation_note,
    receiving: r.receiving_institution_id,
    notifiedAt: iso(r.notified_at),
    actionStatus: r.action_status,
    assignee: r.assigned_to,
    closedAt: iso(r.closed_at),
    closeReason: r.close_reason,
    auditCount: Number(audit.n),
    actionCount: Number(actions.n),
    challengeCount: Number(challenges.n),
    txnCount: Number(txns.n),
  };
}

async function post(
  page: Page,
  id: string,
  intent: string,
  extra: Record<string, unknown> = {},
  headers: Record<string, string> = {},
) {
  return page.request.post(`/api/incidents/${id}`, { data: { intent, ...extra }, headers });
}

async function expectState(id: string, state: string) {
  expect((await snapshot(id)).state).toBe(state);
}

const INTENTS: Array<[string, Record<string, unknown>]> = [
  ["correlate", { status: "CORRELATED", transaction: { ref: `NIP-${randomUUID().slice(0, 8)}`, status: "COMPLETED", amountMinor: 100000, beneficiaryInstitutionId: MMO } }],
  ["notify", { receivingInstitutionId: MMO }],
  ["action", { type: "HOLD_REQUEST", decision: "ACCEPTED", authorityRef: "CPRegs 2022 / test", rationale: "role matrix" }],
  ["challenge", { deferHours: 6, note: "role matrix" }],
  ["close", { reason: "role matrix" }],
  ["assign", { assigneeId: "00000000-0000-0000-0000-000000000000" }],
];

test.describe("roles", () => {
test("analyst: queue is visible but every intent is denied with no state change", async ({ page }) => {
  await signIn(page, ANALYST);
  await expect(page.getByRole("heading", { name: "Case queue" })).toBeVisible();
  const id = await freshCase("CORRELATION_PENDING", "PENDING");
  const before = await snapshot(id);

  for (const [intent, extra] of INTENTS) {
    const payload = intent === "assign" ? { ...extra, assigneeId: await userId(ANALYST) } : extra;
    const res = await post(page, id, intent, payload);
    expect(DENIED, `${intent} returned ${res.status()}: ${await res.text()}`).toContain(res.status());
    expect(await snapshot(id)).toEqual(before);
  }
});

async function fullMutationMatrix(page: Page, email: string) {
  await signIn(page, email);

  // Case A: correlate -> notify -> action -> challenge.
  const a = await freshCase("CORRELATION_PENDING", "PENDING");
  const ref = `NIP-${randomUUID().slice(0, 8)}`;
  let res = await post(page, a, "correlate", {
    status: "CORRELATED",
    note: "role matrix",
    transaction: { ref, status: "COMPLETED", amountMinor: 100000, beneficiaryInstitutionId: MMO },
  });
  expect(res.status(), `correlate: ${await res.text()}`).toBe(200);
  await expectState(a, "CORRELATED");

  res = await post(page, a, "notify", { receivingInstitutionId: MMO });
  expect(res.status(), `notify: ${await res.text()}`).toBe(200);
  await expectState(a, "NOTIFIED");

  res = await post(page, a, "action", {
    type: "HOLD_REQUEST",
    decision: "ACCEPTED",
    authorityRef: "CPRegs 2022 / test",
    rationale: "role matrix",
  });
  expect(res.status(), `action: ${await res.text()}`).toBe(200);
  await expectState(a, "ACTION_ACCEPTED");

  res = await post(page, a, "challenge", { deferHours: 6, note: "role matrix" });
  expect(res.status(), `challenge: ${await res.text()}`).toBe(200);
  await expectState(a, "RECIPIENT_CHALLENGE");

  // Case B: close is legal from NOTIFIED but not from a challenge state.
  const b = await freshCase("NOTIFIED", "CORRELATED");
  res = await post(page, b, "close", { reason: "Customer confirmed safe" });
  expect(res.status(), `close: ${await res.text()}`).toBe(200);
  await expectState(b, "CLOSED");

  // Case C: assignment does not move state, only the owner.
  const c = await freshCase("CORRELATION_PENDING", "PENDING");
  const analystId = await userId(ANALYST);
  res = await post(page, c, "assign", { assigneeId: analystId });
  expect(res.status(), `assign: ${await res.text()}`).toBe(200);
  expect((await snapshot(c)).assignee).toBe(analystId);
}

test("supervisor can correlate, notify, action, challenge, close and assign", async ({ page }) => {
  await fullMutationMatrix(page, SUPERVISOR);
});

test("compliance has the same mutation permissions as supervisor", async ({ page }) => {
  await fullMutationMatrix(page, COMPLIANCE);
});

test("MMO supervisor cannot read or write a Kite case, with no shape leak", async ({ browser }) => {
  const id = await freshCase("CORRELATED", "CORRELATED");
  const before = await snapshot(id);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, MMO_SUPERVISOR);

  const get = await page.request.get(`/console/incidents/${id}`, { maxRedirects: 0 });
  expect(get.status()).toBe(404);
  const getBody = await get.text();
  // The 404 page echoes the requested URL (including the id); that is not a
  // data leak. None of the case's own fields may appear.
  expect(getBody).toMatch(/NEXT_HTTP_ERROR_FALLBACK;404|This page is not in the record/);
  for (const secret of ["cust_roles", "CORRELATED", "SUSPECTED_DURESS", "PIN_DURESS_ENTRY"]) {
    expect(getBody).not.toContain(secret);
  }

  const postRes = await post(page, id, "notify", { receivingInstitutionId: KITE });
  expect(postRes.status()).toBe(404);
  const postBody = await postRes.text();
  expect(postBody).toContain("E_NOT_FOUND");
  for (const secret of [id, "cust_roles", "CORRELATED", "SUSPECTED_DURESS"]) {
    expect(postBody).not.toContain(secret);
  }

  const queue = await page.request.get("/console");
  expect(queue.status()).toBe(200);
  expect(await queue.text()).not.toContain(id);
  expect(await snapshot(id)).toEqual(before);
  await ctx.close();
});

test("mutations without a session are 401", async ({ page }) => {
  const id = await freshCase("CORRELATION_PENDING", "PENDING");
  const before = await snapshot(id);
  await page.goto("/console/login");
  const res = await post(page, id, "close", { reason: "unauthenticated" });
  expect(res.status()).toBe(401);
  expect((await res.json()).error.code).toBe("E_UNAUTHENTICATED");
  expect(await snapshot(id)).toEqual(before);
});

test("logout replay is rejected", async ({ page }) => {
  const email = `roles.revoke.${WORKER}@phylax.test`;
  await ensureUser(email, "analyst");
  await signIn(page, email);
  const replayCookie = await cookieHeader(page);
  const id = await freshCase("CORRELATION_PENDING", "PENDING");

  expect((await page.request.get("/console", { headers: { cookie: replayCookie } })).status()).toBe(200);
  const out = await page.request.post("/api/auth/logout");
  expect(out.status()).toBe(200);

  const replay = await page.request.get("/console", {
    headers: { cookie: replayCookie },
    maxRedirects: 0,
  });
  expect([302, 303, 307, 401]).toContain(replay.status());
  const mutation = await post(
    page,
    id,
    "correlate",
    {
      status: "CORRELATED",
      transaction: { ref: `NIP-${randomUUID().slice(0, 8)}`, status: "COMPLETED", amountMinor: 100000 },
    },
    { cookie: replayCookie },
  );
  expect(mutation.status()).toBe(401);
  expect((await mutation.json()).error.code).toBe("E_UNAUTHENTICATED");
});

test("bumping sessionVersion in the database invalidates an existing cookie", async ({ page }) => {
  const email = `roles.version.${WORKER}@phylax.test`;
  await ensureUser(email, "supervisor");
  await signIn(page, email);
  const replayCookie = await cookieHeader(page);
  const id = await freshCase("CORRELATION_PENDING", "PENDING");

  expect((await page.request.get("/console", { headers: { cookie: replayCookie } })).status()).toBe(200);
  await sql`update users set session_version = session_version + 1 where email = ${email}`;

  const replay = await page.request.get("/console", {
    headers: { cookie: replayCookie },
    maxRedirects: 0,
  });
  expect([302, 303, 307, 401]).toContain(replay.status());
  const mutation = await post(page, id, "close", { reason: "stale cookie" }, { cookie: replayCookie });
  expect(mutation.status()).toBe(401);
  expect((await mutation.json()).error.code).toBe("E_UNAUTHENTICATED");

  // A fresh login after the bump works again.
  await signIn(page, email);
  expect((await page.request.get("/console")).status()).toBe(200);
});
});
