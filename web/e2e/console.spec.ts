import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, email: string) {
  await page.goto("/console/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("phylax-demo-2026");
  await page.getByRole("button", { name: "Enter console" }).click();
  await expect(page).toHaveURL(/\/console$/);
}

test("an analyst sees only their institution's queue", async ({ page }) => {
  await signIn(page, "ada.analyst@kite.example.ng");
  await expect(page.getByRole("heading", { name: "Case queue" })).toBeVisible();
  await expect(page.getByText("Kite Bank").first()).toBeVisible();
  await expect(page.getByText("analyst", { exact: true })).toBeVisible();

  const rows = page.locator("tbody tr");
  expect(await rows.count()).toBeGreaterThan(0);
  await rows.first().getByRole("link").click();
  await expect(page).toHaveURL(/\/console\/incidents\//);
  await expect(page.getByText("Signal", { exact: true })).toBeVisible();
});

test("a second institution cannot open the first institution's case", async ({ browser }) => {
  const first = await browser.newContext();
  const pageA = await first.newPage();
  await signIn(pageA, "ada.analyst@kite.example.ng");
  const href = await pageA.locator("tbody tr a").first().getAttribute("href");
  expect(href).toBeTruthy();
  await first.close();

  const second = await browser.newContext();
  const pageB = await second.newPage();
  await signIn(pageB, "emeka.ops@adaeze.example.ng");
  // page.request carries this context's cookies — the MMO session, not Kite's.
  const res = await pageB.request.get(href!);
  expect(res.status()).toBe(404);
  await second.close();
});

test("an analyst is blocked from recording an action", async ({ page }) => {
  await signIn(page, "ada.analyst@kite.example.ng");
  await page.goto("/console");
  const href = await page.locator("tbody tr a").first().getAttribute("href");
  if (!href) test.skip(true, "No seeded cases");
  await page.goto(href!);

  const actionSection = page.getByText("Record an action decision");
  if (await actionSection.count()) {
    await expect(page.getByText(/Your role cannot record an action/)).toBeVisible();
  }
});

test("unsigned events are rejected and forbidden fields are named", async ({ request }) => {
  const bad = await request.post("/api/v1/events", {
    data: {
      schema_version: "0.1",
      event_id: "00000000-0000-0000-0000-000000000001",
      episode_id: "00000000-0000-0000-0000-000000000002",
      institution_id: "bank_kite",
      event_type: "SUSPECTED_DURESS",
      occurred_at: new Date().toISOString(),
      transaction: { ref: "NIP-TEST", status: "UNKNOWN", narration: "leaked detail" },
      customer: { ref: "cust_1" },
      activation: { method: "PIN_DURESS_ENTRY", confidence: "BANK_AUTHENTICATED", band: "PIN_ONLY_TIER_1" },
      signature: { alg: "Ed25519", key_id: "kite-2026-11", value: "x".repeat(64) },
    },
  });
  expect(bad.status()).toBe(400);
  const body = await bad.json();
  expect(body.error.code).toBe("E_FORBIDDEN_FIELD");
});
