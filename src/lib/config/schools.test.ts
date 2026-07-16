import { describe, expect, it } from "vitest";
import { parseSchoolsConfig, toSchoolPublicProfile } from "@/lib/config/schools";

function school(overrides: Record<string, unknown> = {}) {
  return {
    id: "school-a",
    code: "SCH-A",
    slug: "school-a",
    name: "Sekolah A",
    logoPath: "/schools/school-a/logo.png",
    letterheadPath: "/schools/school-a/letterhead.png",
    headteacher: { name: "Guru Besar A", title: "Guru Besar" },
    passwordHash: "scrypt$16384$8$1$c2FsdA$aGFzaA",
    assessmentPeriods: [
      { year: "2026", assessment: "upsa", spreadsheetId: "a", examName: "UPSA", slipTitle: "UPSA", enabled: true, default: true },
      { year: "2026", assessment: "uasa", spreadsheetId: "b", examName: "UASA", slipTitle: "UASA", enabled: true, default: true },
    ],
    pbdPeriods: [{ year: "2026", spreadsheetId: "c", reportName: "PBD", enabled: true, default: true }],
    ...overrides,
  };
}

describe("school registry", () => {
  it("parses tenant periods and removes secrets from the public profile", () => {
    const parsed = parseSchoolsConfig(JSON.stringify([school()]))[0]!;
    expect(parsed.defaultUpsaPeriod?.year).toBe("2026");
    expect(parsed.defaultUasaPeriod?.assessment).toBe("uasa");
    expect(toSchoolPublicProfile(parsed)).not.toHaveProperty("passwordHash");
    expect(toSchoolPublicProfile(parsed)).not.toHaveProperty("assessmentPeriods");
  });

  it("rejects duplicate school codes case-insensitively", () => {
    expect(() => parseSchoolsConfig(JSON.stringify([school(), school({ id: "school-b", slug: "school-b", code: "sch-a" })]))).toThrow(/duplicate code/);
  });
});
