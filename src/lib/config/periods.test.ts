import { describe, expect, it } from "vitest";
import {
  getDefaultAssessmentPeriod,
  parseAssessmentPeriods,
  parsePbdPeriods,
  resolveAssessmentPeriod,
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

  it("parses PBD periods", () => {
    const periods = parsePbdPeriods(JSON.stringify([
      { year: "2026", spreadsheetId: "pbd-2026", reportName: "PBD 2026", enabled: true, default: true },
      { year: "2027", spreadsheetId: "pbd-2027", reportName: "PBD 2027", enabled: true },
    ]));
    expect(periods.map((period) => period.year)).toEqual(["2026", "2027"]);
  });
});
