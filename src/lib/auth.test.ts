import { beforeAll, describe, expect, it, vi } from "vitest";

const config = JSON.stringify([{
  id: "school-a",
  code: "SCH-A",
  slug: "school-a",
  name: "Sekolah A",
  logoPath: "/logo.png",
  letterheadPath: "/logo.png",
  headteacher: { name: "Guru Besar A", title: "Guru Besar" },
  passwordHash: "scrypt$16384$8$1$c2FsdA$aGFzaA",
  assessmentPeriods: [{ year: "2026", assessment: "upsa", spreadsheetId: "a", examName: "UPSA", slipTitle: "UPSA", enabled: true, default: true }],
  pbdPeriods: [{ year: "2026", spreadsheetId: "c", reportName: "PBD", enabled: true, default: true }],
}]);

let auth: typeof import("@/lib/auth");

beforeAll(async () => {
  process.env.SCHOOLS_CONFIG = config;
  process.env.SESSION_SECRET = "test-session-secret-that-is-at-least-32-characters";
  vi.resetModules();
  auth = await import("@/lib/auth");
});

describe("tenant sessions", () => {
  it("signs and verifies a session for one school", () => {
    const token = auth.createSessionToken("school-a", 1_000_000);
    expect(auth.verifySessionToken(token, 1_001_000)?.id).toBe("school-a");
  });

  it("rejects modified, expired, and unknown-school sessions", () => {
    const token = auth.createSessionToken("school-a", 1_000_000);
    expect(auth.verifySessionToken(`${token}x`, 1_001_000)).toBeNull();
    expect(auth.verifySessionToken(token, 1_000_000 + auth.sessionLifetimeSeconds * 1_000 + 1)).toBeNull();
    expect(auth.verifySessionToken(auth.createSessionToken("school-z", 1_000_000), 1_001_000)).toBeNull();
  });

  it("hashes and verifies scrypt passwords", async () => {
    const hash = await auth.hashSchoolPassword("Long temporary password 123!");
    expect(await auth.verifySchoolPassword("Long temporary password 123!", hash)).toBe(true);
    expect(await auth.verifySchoolPassword("wrong", hash)).toBe(false);
  });
});
