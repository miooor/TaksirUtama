import { describe, expect, it } from "vitest";
import { pbdSemesterFromRequest, pbdSemesterHref, resolvePbdSemester } from "@/lib/pbd/semester";

describe("PBD semester navigation", () => {
  it("uses a valid requested semester before the configured default", () => {
    expect(resolvePbdSemester("1", "2")).toBe("1");
    expect(resolvePbdSemester("2", "1")).toBe("2");
  });

  it("falls back to the configured semester and then Semester 1", () => {
    expect(resolvePbdSemester(undefined, "2")).toBe("2");
    expect(resolvePbdSemester("3", "2")).toBe("2");
    expect(resolvePbdSemester(undefined, undefined)).toBe("1");
  });

  it("preserves semester in page and report links", () => {
    expect(pbdSemesterHref("/pbd/periods/2026", "2")).toBe("/pbd/periods/2026?semester=2");
    expect(pbdSemesterHref("/pbd/entry?year=2026", "1")).toBe("/pbd/entry?year=2026&semester=1");
    expect(pbdSemesterFromRequest(new Request("https://example.test/api/pbd?semester=2"))).toBe("2");
  });
});
