import { expect, test } from "@playwright/test";
import { createHmac } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";

function launchSessionToken() {
  const now = Math.floor(Date.now() / 1000);
  const encoded = Buffer.from(JSON.stringify({ v: 1, schoolId: "school-a", issuedAt: now, expiresAt: now + 3600 })).toString("base64url");
  const signature = createHmac("sha256", "REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS").update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

test.describe("PBD entry cockpit", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{
      name: "ssp_session",
      value: launchSessionToken(),
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    }]);
  });

  test("subject view renders with database prompt and no horizontal overflow", async ({ page }) => {
    await page.goto("/pbd/entry?year=2026&semester=1&view=subject");
    await expect(page.getByRole("heading", { name: /pengisian rumusan tp/i })).toBeVisible();
    await expect(page.getByText(/satu subjek, semua kelas yang ditetapkan/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /pangkalan data belum disambungkan/i })).toBeVisible();
    await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  });

  test("class view renders with class-mode copy", async ({ page }) => {
    await page.goto("/pbd/entry?year=2026&semester=1&view=class&classId=some-class-id");
    await expect(page.getByRole("heading", { name: /pengisian rumusan tp/i })).toBeVisible();
    await expect(page.getByText(/satu kelas, semua subjek yang ditetapkan/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /pangkalan data belum disambungkan/i })).toBeVisible();
    await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  });

  test("default view falls back to subject mode for legacy links", async ({ page }) => {
    await page.goto("/pbd/entry?year=2026&semester=1");
    await expect(page.getByText(/satu subjek, semua kelas yang ditetapkan/i)).toBeVisible();
  });

  test("entry cockpit is accessible in both modes", async ({ page }) => {
    await page.goto("/pbd/entry?year=2026&semester=1&view=subject");
    const subjectAccessibility = await new AxeBuilder({ page }).analyze();
    expect(subjectAccessibility.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);

    await page.goto("/pbd/entry?year=2026&semester=1&view=class");
    const classAccessibility = await new AxeBuilder({ page }).analyze();
    expect(classAccessibility.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
  });

  test("dashboard renders the PBD operations shell", async ({ page }) => {
    await page.goto("/dashboard?year=2026&semester=1");
    await expect(page.getByRole("heading", { name: /operasi pbd/i })).toBeVisible();
    await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  });
});
