import { describe, expect, it } from "vitest";
import { isUasaDataAvailable } from "@/lib/config/uasaAvailability";
import type { AssessmentPeriod } from "@/lib/config/periods";

const period: AssessmentPeriod = {
  year: "2026",
  assessment: "uasa",
  spreadsheetId: "sheet-id",
  examName: "UASA 2026",
  slipTitle: "UASA 2026",
  enabled: true,
  default: false,
  availableFrom: "2026-10-01T00:00:00+08:00",
};

describe("isUasaDataAvailable", () => {
  it("keeps UASA unavailable before October 2026", () => {
    expect(isUasaDataAvailable(period, new Date("2026-06-09T00:00:00+08:00"))).toBe(false);
  });

  it("requires a spreadsheet id even after October 2026", () => {
    expect(isUasaDataAvailable({ ...period, spreadsheetId: "" }, new Date("2026-10-01T00:00:00+08:00"))).toBe(false);
  });

  it("allows UASA when the sheet exists from October 2026 onward", () => {
    expect(isUasaDataAvailable(period, new Date("2026-10-01T00:00:00+08:00"))).toBe(true);
  });
});
