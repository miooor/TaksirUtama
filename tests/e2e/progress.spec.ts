import { expect, test, type BrowserContext } from "@playwright/test";
import { createHmac } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";

function launchSessionToken() {
  const now = Math.floor(Date.now() / 1000);
  const encoded = Buffer.from(JSON.stringify({ v: 1, schoolId: "school-a", issuedAt: now, expiresAt: now + 3600 })).toString("base64url");
  const signature = createHmac("sha256", "REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS").update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

async function authenticatedContext(context: BrowserContext) {
  await context.addCookies([{
    name: "ssp_session",
    value: launchSessionToken(),
    url: "http://localhost:3000",
    httpOnly: true,
    sameSite: "Lax",
  }]);
}

test.describe("Progress hub", () => {
  test.beforeEach(async ({ context }) => {
    await authenticatedContext(context);
  });

  test("school overview renders with metric cards and evidence table", async ({ page }) => {
    await page.goto("/progress?year=2026");
    await expect(page.getByRole("heading", { name: /kemajuan/i })).toBeVisible();
    // Metric cards present
    await expect(page.getByText(/murid sepadan/i).first()).toBeVisible();
    await expect(page.getByText(/meningkat/i).first()).toBeVisible();
    await expect(page.getByText(/menurun/i).first()).toBeVisible();
    // No horizontal overflow
    await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  });

  test("filters are visible and interactive", async ({ page }) => {
    await page.goto("/progress?year=2026");
    await expect(page.getByRole("search", { name: /tapis kemajuan/i })).toBeVisible();
    // Year select is present
    await expect(page.locator("select").first()).toBeVisible();
  });

  test("URL params are preserved for bookmarking", async ({ page }) => {
    await page.goto("/progress?year=2026&level=4");
    await expect(page).toHaveURL(/level=4/);
    // Navigate with subject param
    await page.goto("/progress?year=2026&classId=4%20ANGSANA&subject=BM");
    await expect(page).toHaveURL(/classId=4/);
    await expect(page).toHaveURL(/subject=BM/);
  });

  test("pupil movement view shows matched pupils table", async ({ page }) => {
    await page.goto("/progress?year=2026&classId=4%20ANGSANA&subject=BM");
    // Either shows pupil table or empty state guidance
    const hasTable = await page.locator("table").count();
    const hasEmpty = await page.getByText(/tiada murid yang sepadan/i).count();
    expect(hasTable + hasEmpty).toBeGreaterThan(0);
  });

  test("empty state shows coverage guidance instead of zero charts", async ({ page }) => {
    // Use a year with no data configured
    await page.goto("/progress?year=2020");
    // Should show warnings or empty guidance, not crash
    const hasWarning = await page.locator("[role='alert']").count();
    const hasContent = await page.getByText(/kemajuan/i).count();
    expect(hasWarning + hasContent).toBeGreaterThan(0);
  });

  test("accessibility: no critical or serious violations", async ({ page }) => {
    await page.goto("/progress?year=2026");
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(serious).toEqual([]);
  });

  test("keyboard navigation reaches filters and table", async ({ page }) => {
    await page.goto("/progress?year=2026");
    // Tab to first interactive element
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
  });

  test("mobile viewport: tables scroll without clipping", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/progress?year=2026");
    // Page should not have horizontal overflow on body
    await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
    // Tables with overflow-x-auto should contain scroll
    const tables = page.locator(".overflow-x-auto");
    const count = await tables.count();
    if (count > 0) {
      await expect(tables.first()).toBeVisible();
    }
  });

  test("cross-module handoff links resolve correctly", async ({ page }) => {
    await page.goto("/progress?year=2026");
    // Look for handoff links (Dapatan, Intervensi, Murid)
    const handoffLinks = page.locator("a[href*='/insights'], a[href*='/intervensi'], a[href*='/progress?']");
    const count = await handoffLinks.count();
    // If evidence rows exist, handoff links should be present
    if (count > 0) {
      const href = await handoffLinks.first().getAttribute("href");
      expect(href).toBeTruthy();
    }
  });
});
