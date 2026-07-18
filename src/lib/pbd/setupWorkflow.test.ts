import { describe, expect, it } from "vitest";
import type { DatabasePbdSetup } from "@/lib/db/pbd";
import { pbdSetupCounts, resolvePbdSetupView } from "./setupWorkflow";

function setup(overrides: Partial<DatabasePbdSetup> = {}): DatabasePbdSetup {
  return {
    schoolId: "school",
    yearId: null,
    periodId: null,
    classes: [],
    subjects: [],
    rows: [],
    ...overrides,
  };
}

describe("PBD setup workspace", () => {
  it("keeps an explicitly requested valid view", () => {
    expect(resolvePbdSetupView("subjects", setup())).toBe("subjects");
  });

  it("guides incomplete setup in dependency order", () => {
    expect(resolvePbdSetupView(undefined, setup())).toBe("classes");
    expect(resolvePbdSetupView(undefined, setup({ classes: [{ id: "c", name: "1 A", enrolledCount: 20, levelKind: "tahun", levelNumber: 1, active: true, canDelete: true }] }))).toBe("subjects");
  });

  it("opens assignments once active classes and subjects exist", () => {
    expect(resolvePbdSetupView("unknown", setup({
      classes: [{ id: "c", name: "1 A", enrolledCount: 20, levelKind: "tahun", levelNumber: 1, active: true, canDelete: true }],
      subjects: [{ id: "s", code: "BM", name: "Bahasa Melayu", active: true, canDelete: true }],
    }))).toBe("assignments");
  });

  it("excludes archived setup records from operational counts", () => {
    const data = setup({
      classes: [
        { id: "c1", name: "1 A", enrolledCount: 20, levelKind: "tahun", levelNumber: 1, active: true, canDelete: false },
        { id: "c2", name: "1 B", enrolledCount: 20, levelKind: "tahun", levelNumber: 1, active: false, canDelete: false },
      ],
      subjects: [
        { id: "s1", code: "BM", name: "Bahasa Melayu", active: true, canDelete: false },
        { id: "s2", code: "BI", name: "Bahasa Inggeris", active: false, canDelete: false },
      ],
      rows: [
        { classSubjectId: "a1", classId: "c1", subjectId: "s1", className: "1 A", classLevelKind: "tahun", classLevelNumber: 1, subjectCode: "BM", subjectName: "Bahasa Melayu", enrolledCount: 20, active: true, entry: null },
        { classSubjectId: "a2", classId: "c2", subjectId: "s1", className: "1 B", classLevelKind: "tahun", classLevelNumber: 1, subjectCode: "BM", subjectName: "Bahasa Melayu", enrolledCount: 20, active: true, entry: null },
      ],
    });
    expect(pbdSetupCounts(data)).toEqual({ classes: 1, subjects: 1, assignments: 1 });
  });
});
