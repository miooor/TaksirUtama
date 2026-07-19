import { describe, expect, it } from "vitest";
import {
  getDefaultAssessmentPeriod,
  parseAssessmentPeriods,
  parsePbdPeriods,
  resolveAssessmentPeriod,
  resolvePbdPeriod,
} from "@/lib/config/periods";

const assessmentPeriods = JSON.stringify([
  {
    year: "2026",
    assessment: "upsa",
    spreadsheetId: "upsa-2026",
    examName: "UPSA 2026",
    slipTitle: "SLIP UPSA 2026",
    enabled: true,
    default: true,
  },
  {
    year: "2027",
    assessment: "uasa",
    spreadsheetId: "uasa-2027",
    examName: "UASA 2027",
    slipTitle: "SLIP UASA 2027",
    enabled: true,
    default: true,
  },
]);

describe("period config", () => {
  it("parses assessment periods and resolves a specific year/type", () => {
    const periods = parseAssessmentPeriods(assessmentPeriods);
    expect(getDefaultAssessmentPeriod(periods)?.year).toBe("2026");
    expect(resolveAssessmentPeriod(periods, "2027", "uasa")).toMatchObject({
      assessment: "uasa",
      spreadsheetId: "uasa-2027",
    });
  });

  it("rejects assessment config without exactly one enabled default", () => {
    expect(() => parseAssessmentPeriods(JSON.stringify([
      { year: "2026", assessment: "upsa", spreadsheetId: "a", examName: "A", slipTitle: "A", enabled: true },
    ]))).toThrow(/exactly one/);
  });

  it("ignores disabled periods when resolving", () => {
    const periods = parseAssessmentPeriods(JSON.stringify([
      { year: "2026", assessment: "upsa", spreadsheetId: "a", examName: "A", slipTitle: "A", enabled: true, default: true },
      { year: "2027", assessment: "uasa", spreadsheetId: "b", examName: "B", slipTitle: "B", enabled: false },
    ]));
    expect(resolveAssessmentPeriod(periods, "2027", "uasa")).toBeNull();
  });

  it("returns null for unknown assessment periods", () => {
    const periods = parseAssessmentPeriods(assessmentPeriods);
    expect(resolveAssessmentPeriod(periods, "2028", "upsa")).toBeNull();
  });

  it("parses PBD periods and allows same year with different semesters", () => {
    const periods = parsePbdPeriods(JSON.stringify([
      { year: "2026", semester: "1", spreadsheetId: "pbd-s1", reportName: "PBD Pertengahan 2026", enabled: true, default: true },
      { year: "2026", semester: "2", spreadsheetId: "pbd-s2", reportName: "PBD Akhir 2026", enabled: true },
    ]));
    expect(periods.map((period) => `${period.year}:${period.semester}`)).toEqual(["2026:1", "2026:2"]);
    expect(resolvePbdPeriod(periods, "2026", "1")?.spreadsheetId).toBe("pbd-s1");
    expect(resolvePbdPeriod(periods, "2026", "2")?.spreadsheetId).toBe("pbd-s2");
  });

  it("rejects duplicate PBD year+semester", () => {
    expect(() => parsePbdPeriods(JSON.stringify([
      { year: "2026", semester: "1", spreadsheetId: "a", reportName: "A", enabled: true, default: true },
      { year: "2026", semester: "1", spreadsheetId: "b", reportName: "B", enabled: true },
    ]))).toThrow(/duplicate/);
  });
});
