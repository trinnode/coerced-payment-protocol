import { expect, test } from "@playwright/test";

test("landing reads as a document and states its status", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Somebody is standing over the phone",
  );
  await expect(page.getByText("Willingness to pay")).toBeVisible();
  await expect(page.getByText("untested")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Things we will not build/ })).toBeVisible();
  await expect(page.locator("footer")).toContainText("Not a regulated financial service");
  expect(errors).toEqual([]);
});

test("protocol and safety documents render from the repository", async ({ page }) => {
  await page.goto("/protocol");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Duress Event Protocol");
  await expect(page.getByText("RECEIVED_NOT_VERIFIED").first()).toBeVisible();

  await page.goto("/safety");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Threat model");
});

test("health endpoint reports the database", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.checks.database).toBe("up");
});
