import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("health endpoint is non-sensitive and security headers are present", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ status: "ok" });
  expect(response.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
});

test("PWA manifest, service worker, and offline fallback are public", async ({ request, page }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  expect(await manifestResponse.json()).toMatchObject({
    name: "Analisa Kurikulum",
    start_url: "/dashboard",
    display: "standalone",
  });

  const serviceWorkerResponse = await request.get("/sw.js");
  expect(serviceWorkerResponse.ok()).toBe(true);
  expect(serviceWorkerResponse.headers()["content-type"]).toContain("application/javascript");
  expect(serviceWorkerResponse.headers()["cache-control"]).toContain("no-store");

  const offlineResponse = await request.get("/offline");
  expect(offlineResponse.ok()).toBe(true);
  expect(await offlineResponse.text()).toContain("Tiada sambungan internet");

  await page.goto("/offline");
  await expect(page.getByRole("heading", { name: "Tiada sambungan internet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cuba semula" })).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  const offlineAccessibility = await new AxeBuilder({ page }).analyze();
  expect(offlineAccessibility.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

test("school login remains usable with pointer and keyboard", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /masuk ke sistem/i })).toBeVisible();
  const loginAccessibility = await new AxeBuilder({ page }).analyze();
  expect(loginAccessibility.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
  const code = page.getByLabel(/kod sekolah/i);
  const password = page.getByLabel(/kata laluan/i);
  await code.fill("SCH-A");
  await password.fill("not-the-password");
  await password.press("Enter");
  await expect(page.getByText(/kod sekolah atau kata laluan tidak sah/i)).toBeVisible();
});
