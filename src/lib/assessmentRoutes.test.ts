import { describe, expect, it } from "vitest";
import { assessmentModuleDestination, correctedAssessmentPath } from "@/lib/assessmentRoutes";
import type { AssessmentPeriod, PbdPeriod } from "@/lib/config/periods";

const assessmentPeriods: AssessmentPeriod[] = [
  {
    year: "2026",
    assessment: "upsa",
    spreadsheetId: "upsa",
    examName: "UPSA 2026",
    slipTitle: "UPSA 2026",
    enabled: true,
    default: true,
  },
  {
    year: "2026",
    assessment: "uasa",
    spreadsheetId: "uasa",
    examName: "UASA 2026",
    slipTitle: "UASA 2026",
    enabled: true,
    default: false,
    availableFrom: "2026-10-01T00:00:00+08:00",
  },
];
const pbdPeriods: PbdPeriod[] = [
  {
    year: "2026",
    spreadsheetId: "pbd",
    reportName: "PBD 2026",
    enabled: true,
    default: true,
  },
];

describe("assessment route helpers", () => {
  it("routes UPSA module landing to class selection", () => {
    expect(assessmentModuleDestination({
      year: "2026",
      assessment: "upsa",
      assessmentPeriods,
      pbdPeriods,
    })).toBe("/assessments/2026/upsa/classes");
  });

  it("routes unavailable UASA to the friendly UASA page", () => {
    expect(assessmentModuleDestination({
      year: "2026",
      assessment: "uasa",
      assessmentPeriods,
      pbdPeriods,
      now: new Date("2026-06-09T00:00:00+08:00"),
    })).toBe("/uasa?year=2026");
  });

  it("returns null for missing years and unknown assessments", () => {
    expect(assessmentModuleDestination({
      year: "2027",
      assessment: "upsa",
      assessmentPeriods,
      pbdPeriods,
    })).toBeNull();
    expect(assessmentModuleDestination({
      year: "2026",
      assessment: "unknown",
      assessmentPeriods,
      pbdPeriods,
    })).toBeNull();
  });

  it("corrects the common assesments typo", () => {
    expect(correctedAssessmentPath(["2026", "upsa"])).toBe("/assessments/2026/upsa");
    expect(correctedAssessmentPath(undefined)).toBe("/assessments");
  });
});
