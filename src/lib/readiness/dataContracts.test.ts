import { describe, expect, it } from "vitest";
import { validateAssessmentClassSheet, validatePbdSubjectSheet, validateWorkbookConfig } from "@/lib/readiness/dataContracts";

describe("workbook data contracts", () => {
  it("validates tenant identity, year, semester, and schema version", () => {
    expect(validateWorkbookConfig([["schemaVersion", "1"], ["schoolCode", "SCH-A"], ["workbookType", "upsa"], ["year", "2026"]], "SCH-A", "upsa", "2026")).toEqual([]);
    expect(validateWorkbookConfig([["schemaVersion", "1"], ["schoolCode", "SCH-B"], ["workbookType", "upsa"], ["year", "2026"]], "SCH-A", "upsa", "2026")).toEqual(expect.arrayContaining([expect.objectContaining({ code: "school_code", severity: "fatal" })]));
    expect(validateWorkbookConfig([["schemaVersion", "1"], ["schoolCode", "SCH-A"], ["workbookType", "upsa"], ["year", "2025"]], "SCH-A", "upsa", "2026")).toEqual(expect.arrayContaining([expect.objectContaining({ code: "year_mismatch", severity: "fatal" })]));
    expect(validateWorkbookConfig([["schemaVersion", "1"], ["schoolCode", "SCH-A"], ["workbookType", "pbd"], ["year", "2026"], ["semester", "1"]], "SCH-A", "pbd", "2026", "1")).toEqual([]);
    expect(validateWorkbookConfig([["schemaVersion", "1"], ["schoolCode", "SCH-A"], ["workbookType", "pbd"], ["year", "2026"], ["semester", "2"]], "SCH-A", "pbd", "2026", "1")).toEqual(expect.arrayContaining([expect.objectContaining({ code: "semester_mismatch", severity: "fatal" })]));
  });

  it("accepts a valid assessment header and rejects a broken grade pair", () => {
    expect(validateAssessmentClassSheet([["BIL", "NAMA", "BM", "GRED"]], "1 A")).toEqual([]);
    expect(validateAssessmentClassSheet([["BIL", "SUBJEK", "BM", "GRED"]], "1 A")).toEqual([]);
    expect(validateAssessmentClassSheet([["BIL", "NAMA", "BM", "MARKAH"]], "1 A")).toEqual(expect.arrayContaining([expect.objectContaining({ code: "grade_pair" })]));
  });

  it("accepts reordered PBD headers by name", () => {
    const headers = ["KELAS", "JUMLAH MURID", "TP 6", "TP 1", "TP 2", "TP 3", "TP 4", "TP 5", "BILANGAN MURID TIDAK DITAKSIR"];
    expect(validatePbdSubjectSheet([headers], "BM")).toEqual([]);
  });
});
