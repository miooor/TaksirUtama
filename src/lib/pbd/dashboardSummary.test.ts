import { describe, expect, it } from "vitest";
import type { DatabasePbdSetup } from "@/lib/db/pbd";
import { classifyDashboardPbdRow, resolveDashboardSelection, summarizeDashboardPbd } from "@/lib/pbd/dashboardSummary";

type Row = DatabasePbdSetup["rows"][number];

const baseRow: Row = {
  classSubjectId: "assignment-1",
  classId: "class-1",
  subjectId: "subject-1",
  className: "1 Cemerlang",
  classLevelKind: "tahun",
  classLevelNumber: 1,
  subjectCode: "BM",
  subjectName: "Bahasa Melayu",
  enrolledCount: 30,
  active: true,
  entry: null,
};

function entry(status: "draft" | "final", values: Array<number | null>, enrolledCount = 30): NonNullable<Row["entry"]> {
  return {
    id: "entry-1",
    revision: 1,
    status,
    enrolledCount,
    counts: { TP1: values[0]!, TP2: values[1]!, TP3: values[2]!, TP4: values[3]!, TP5: values[4]!, TP6: values[5]! },
    notAssessedCount: values[6]!,
  };
}

function setup(rows: Row[], overrides: Partial<DatabasePbdSetup> = {}): DatabasePbdSetup {
  return {
    schoolId: "school-1",
    yearId: "year-1",
    periodId: "period-1",
    classes: [{ id: "class-1", name: "1 Cemerlang", enrolledCount: 30, levelKind: "tahun", levelNumber: 1, teacherName: null, active: true, canDelete: false }],
    subjects: [{ id: "subject-1", code: "BM", name: "Bahasa Melayu", active: true, canDelete: false }],
    rows,
    ...overrides,
  };
}

describe("dashboard PBD summary", () => {
  it("resolves valid queries and falls back to the configured PBD semester", () => {
    const pbdPeriods = [
      { year: "2026", semester: "2" as const, spreadsheetId: "", reportName: "PBD 2026", enabled: true, default: true },
    ];
    expect(resolveDashboardSelection({ availableYears: ["2025", "2026"], pbdPeriods, requestedYear: "2026", requestedSemester: "1", defaultPbdYear: "2026" })).toEqual({ year: "2026", semester: "1" });
    expect(resolveDashboardSelection({ availableYears: ["2025", "2026"], pbdPeriods, requestedYear: "2099", requestedSemester: "3", defaultPbdYear: "2026" })).toEqual({ year: "2026", semester: "2" });
    expect(resolveDashboardSelection({ availableYears: [], pbdPeriods: [] })).toEqual({ year: "2026", semester: "1" });
  });

  it("classifies empty, mismatched, ready and finalized rows", () => {
    expect(classifyDashboardPbdRow(baseRow)).toBe("empty");
    expect(classifyDashboardPbdRow({ ...baseRow, entry: entry("draft", [null, null, null, null, null, null, null]) })).toBe("empty");
    expect(classifyDashboardPbdRow({ ...baseRow, entry: entry("draft", [0, 0, 10, 10, 5, null, 0]) })).toBe("mismatch");
    expect(classifyDashboardPbdRow({ ...baseRow, entry: entry("draft", [0, 0, 10, 10, 10, 0, 0]) })).toBe("ready");
    expect(classifyDashboardPbdRow({ ...baseRow, entry: entry("final", [0, 0, 8, 8, 8, 0, 0], 24) })).toBe("final");
  });

  it("returns meaningful zero progress for empty setup", () => {
    const summary = summarizeDashboardPbd(setup([], { classes: [], subjects: [] }));
    expect(summary).toMatchObject({ activeClasses: 0, activeSubjects: 0, assignments: 0, finalizedPercentage: 0 });
  });

  it("excludes archived setup records and preserves finalized enrolment snapshots", () => {
    const finalized = { ...baseRow, entry: entry("final", [0, 0, 8, 8, 8, 0, 0], 24) };
    const archived = { ...baseRow, classSubjectId: "assignment-2", active: false };
    const summary = summarizeDashboardPbd(setup([finalized, archived]));
    expect(summary).toMatchObject({ assignments: 1, final: 1, pupils: 24, finalizedPercentage: 100 });
  });

  it("orders subjects by mismatch, ready, empty and then code", () => {
    const rows: Row[] = [
      { ...baseRow, subjectId: "subject-a", subjectCode: "A", subjectName: "Alpha", entry: entry("draft", [0, 0, 10, 10, 10, 0, 0]) },
      { ...baseRow, classSubjectId: "assignment-b", subjectId: "subject-b", subjectCode: "B", subjectName: "Beta", entry: entry("draft", [1, null, null, null, null, null, null]) },
    ];
    const subjects = [
      { id: "subject-a", code: "A", name: "Alpha", active: true, canDelete: false },
      { id: "subject-b", code: "B", name: "Beta", active: true, canDelete: false },
    ];
    expect(summarizeDashboardPbd(setup(rows, { subjects })).subjectsNeedingAction.map((item) => item.code)).toEqual(["B", "A"]);
  });

  it("produces a class-level work queue ordered mismatched first, then ready, then empty", () => {
    const rows: Row[] = [
      { ...baseRow, classSubjectId: "assignment-1", classId: "class-1", className: "1 Cemerlang", entry: entry("draft", [0, 0, 10, 10, 10, 0, 0]) },
      { ...baseRow, classSubjectId: "assignment-2", classId: "class-2", className: "2 Bestari", entry: entry("draft", [1, null, null, null, null, null, null]) },
      { ...baseRow, classSubjectId: "assignment-3", classId: "class-3", className: "3 Angsana", entry: entry("draft", [5, 5, 5, 5, null, null, null]) },
      { ...baseRow, classSubjectId: "assignment-4", classId: "class-4", className: "4 Cerdik", entry: entry("final", [0, 0, 8, 8, 8, 0, 0], 24) },
    ];
    const classes = [
      { id: "class-1", name: "1 Cemerlang", enrolledCount: 30, levelKind: "tahun" as const, levelNumber: 1, teacherName: null, active: true, canDelete: false },
      { id: "class-2", name: "2 Bestari", enrolledCount: 30, levelKind: "tahun" as const, levelNumber: 2, teacherName: null, active: true, canDelete: false },
      { id: "class-3", name: "3 Angsana", enrolledCount: 30, levelKind: "tahun" as const, levelNumber: 3, teacherName: null, active: true, canDelete: false },
      { id: "class-4", name: "4 Cerdik", enrolledCount: 24, levelKind: "tahun" as const, levelNumber: 4, teacherName: null, active: true, canDelete: false },
    ];
    const summary = summarizeDashboardPbd(setup(rows, { classes }));
    expect(summary.classesNeedingAction.map((item) => item.name)).toEqual(["2 Bestari", "3 Angsana", "1 Cemerlang"]);
    expect(summary.classesNeedingAction[0]).toMatchObject({ id: "class-2", assignments: 1, mismatch: 1 });
    expect(summary.classesNeedingAction[1]).toMatchObject({ id: "class-3", mismatch: 1 });
    expect(summary.classesNeedingAction[2]).toMatchObject({ id: "class-1", empty: 0, ready: 1 });
  });

  it("aggregates multiple subjects into one class queue item", () => {
    const rows: Row[] = [
      { ...baseRow, classSubjectId: "assignment-1", classId: "class-1", className: "1 Cemerlang", subjectId: "subject-1", entry: entry("draft", [0, 0, 10, 10, 10, 0, 0]) },
      { ...baseRow, classSubjectId: "assignment-2", classId: "class-1", className: "1 Cemerlang", subjectId: "subject-2", subjectCode: "BI", subjectName: "Bahasa Inggeris", entry: entry("draft", [1, null, null, null, null, null, null]) },
    ];
    const subjects = [
      { id: "subject-1", code: "BM", name: "Bahasa Melayu", active: true, canDelete: false },
      { id: "subject-2", code: "BI", name: "Bahasa Inggeris", active: true, canDelete: false },
    ];
    const summary = summarizeDashboardPbd(setup(rows, { subjects }));
    expect(summary.classesNeedingAction).toHaveLength(1);
    expect(summary.classesNeedingAction[0]).toMatchObject({ id: "class-1", name: "1 Cemerlang", assignments: 2, ready: 1, mismatch: 1 });
  });
});
