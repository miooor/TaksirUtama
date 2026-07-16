import { describe, expect, it } from "vitest";
import { assessmentCacheIdentity, pbdCacheIdentity } from "@/lib/tenantCache";
import type { SchoolContext } from "@/lib/config/schools";

function context(id: string): SchoolContext {
  return {
    id, code: id, slug: id, name: id, systemName: "Analisa", logoPath: "/logo.png", letterheadPath: "/logo.png",
    headteacher: { name: "GB", title: "Guru Besar" }, locale: "ms", timezone: "Asia/Kuala_Lumpur", passwordHash: "hash",
    assessmentPeriods: [], pbdPeriods: [], defaultUpsaPeriod: null, defaultUasaPeriod: null, defaultPbdPeriod: null,
  };
}

describe("tenant cache identities", () => {
  it("separates schools with identical years and workbook shapes", () => {
    const assessment = { year: "2026", assessment: "upsa" as const, spreadsheetId: "sheet", examName: "UPSA", slipTitle: "UPSA", enabled: true, default: true };
    const pbd = { year: "2026", spreadsheetId: "sheet", reportName: "PBD", enabled: true, default: true };
    expect(assessmentCacheIdentity(context("school-a"), assessment)).not.toEqual(assessmentCacheIdentity(context("school-b"), assessment));
    expect(pbdCacheIdentity(context("school-a"), pbd)).not.toEqual(pbdCacheIdentity(context("school-b"), pbd));
  });
});
