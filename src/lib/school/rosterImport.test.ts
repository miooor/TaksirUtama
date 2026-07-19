import { describe, expect, it } from "vitest";
import { buildRosterImportPreview, parseRosterMatrix, parseRosterPaste } from "@/lib/school/rosterImport";
import type { SchoolRegistry } from "@/types/registry";

const registry: SchoolRegistry = {
  schoolId: "school-1", year: "2026", academicYearId: "school-1:2026",
  students: [{ id: "student-1", pupilCode: "S001", displayName: "Ali Ahmad", normalizedName: "ALI AHMAD", active: true }],
  enrollments: [{
    id: "enrollment-1", studentId: "student-1", classId: "class-1", className: "1 Cemerlang",
    academicYearId: "school-1:2026", rosterNumber: 1, active: true,
    student: { id: "student-1", pupilCode: "S001", displayName: "Ali Ahmad", normalizedName: "ALI AHMAD", active: true },
  }],
};

describe("school roster import", () => {
  it("parses the agreed Malay spreadsheet columns", () => {
    expect(parseRosterMatrix([
      ["KOD_MURID", "NAMA_MURID", "KELAS", "BIL"],
      ["S002", "Nur Aina", "1 Cemerlang", 2],
    ])).toEqual([{ rowNumber: 2, pupilCode: "S002", displayName: "Nur Aina", className: "1 Cemerlang", rosterNumber: 2 }]);
  });

  it("parses class paste with optional tab-separated roster numbers", () => {
    expect(parseRosterPaste("2\tNur Aina\nKumar Raj", "1 Cemerlang")).toEqual([
      { rowNumber: 1, pupilCode: null, displayName: "Nur Aina", className: "1 Cemerlang", rosterNumber: 2 },
      { rowNumber: 2, pupilCode: null, displayName: "Kumar Raj", className: "1 Cemerlang", rosterNumber: null },
    ]);
  });

  it("matches stable codes, reports unknown classes, and previews new pupils", () => {
    const preview = buildRosterImportPreview([
      { rowNumber: 2, pupilCode: "S001", displayName: "Ali Ahmad", className: "1 Cemerlang", rosterNumber: 1 },
      { rowNumber: 3, pupilCode: null, displayName: "Nur Aina", className: "1 Cemerlang", rosterNumber: 2 },
      { rowNumber: 4, pupilCode: null, displayName: "Unknown", className: "9 Missing", rosterNumber: 1 },
    ], [{ id: "class-1", name: "1 Cemerlang", active: true }], registry);
    expect(preview).toMatchObject({ matchCount: 1, createCount: 1, errorCount: 1 });
  });

  it("allows two pupils with the same name when roster identity is distinct", () => {
    const preview = buildRosterImportPreview([
      { rowNumber: 2, pupilCode: null, displayName: "Nur Aina", className: "1 Cemerlang", rosterNumber: 2 },
      { rowNumber: 3, pupilCode: null, displayName: "Nur Aina", className: "1 Cemerlang", rosterNumber: 3 },
    ], [{ id: "class-1", name: "1 Cemerlang", active: true }], registry);
    expect(preview).toMatchObject({ createCount: 2, errorCount: 0 });
  });
});
