import { describe, expect, it } from "vitest";
import { resolveInterventionQueryContext } from "@/lib/pbd/interventionContext";

const school = {
  pbdPeriods: [{ year: "2026", semester: "2", reportName: "PBD 2026", spreadsheetId: "sheet" }],
  defaultPbdPeriod: { year: "2026", semester: "2", reportName: "PBD 2026", spreadsheetId: "sheet" },
} as never;

describe("intervention query context", () => {
  it("uses the academic year and explicit semester", () => {
    expect(resolveInterventionQueryContext(school, { year: "2026", semester: "1" })).toMatchObject({ year: "2026", semester: "1", level: null });
  });

  it("interprets legacy year 1..6 as a level", () => {
    expect(resolveInterventionQueryContext(school, { year: "4" })).toMatchObject({ year: "2026", semester: "2", level: 4 });
  });
});
