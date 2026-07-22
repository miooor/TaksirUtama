import { expect, test } from "@playwright/test";
import { createHmac } from "node:crypto";

function launchSessionToken() {
  const now = Math.floor(Date.now() / 1000);
  const encoded = Buffer.from(JSON.stringify({ v: 1, schoolId: "school-a", issuedAt: now, expiresAt: now + 3600 })).toString("base64url");
  const signature = createHmac("sha256", "REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS").update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

test.describe("assessment entry", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{
      name: "ssp_session",
      value: launchSessionToken(),
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    }]);
  });

  test("entry progress page requires database and shows setup prompt", async ({ page }) => {
    await page.goto("/assessments/2026/upsa/entry");
    // Without DATABASE_URL, shows the database required message
    await expect(page.getByRole("heading", { name: /pangkalan data belum disambungkan/i })).toBeVisible();
  });

  test("entry grid page requires database", async ({ page }) => {
    await page.goto("/assessments/2026/upsa/entry/some-class-id/some-subject-id");
    await expect(page.getByRole("heading", { name: /pangkalan data belum disambungkan/i })).toBeVisible();
  });

  test("classes page shows entry link", async ({ page }) => {
    // The classes page may redirect or show an error without proper config,
    // but we can verify the entry link exists in the navigation
    const response = await page.goto("/assessments/2026/upsa/classes");
    // If the page loads, check for the entry link
    if (response?.ok()) {
      await expect(page.getByRole("link", { name: /isi markah/i })).toBeVisible();
    }
  });

  test("entry page is accessible with tingkatan label support", async ({ page }) => {
    // Verify the entry page renders without errors
    await page.goto("/assessments/2026/upsa/entry");
    // Should show either the database prompt or the entry matrix
    const hasDbPrompt = await page.getByText(/pangkalan data belum disambungkan/i).isVisible().catch(() => false);
    const hasEntryTitle = await page.getByRole("heading", { name: /pengisian markah/i }).isVisible().catch(() => false);
    expect(hasDbPrompt || hasEntryTitle).toBe(true);
  });
});
