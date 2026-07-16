import { describe, expect, it } from "vitest";
import { validateAssessmentClassSheet, validatePbdSubjectSheet, validateWorkbookConfig } from "@/lib/readiness/dataContracts";

describe("workbook data contracts", () => {
  it("validates tenant identity and schema version", () => {
    expect(validateWorkbookConfig([["schemaVersion", "1"], ["schoolCode", "SCH-A"], ["workbookType", "assessment"]], "SCH-A", "assessment")).toEqual([]);
    expect(validateWorkbookConfig([["schemaVersion", "1"], ["schoolCode", "SCH-B"], ["workbookType", "assessment"]], "SCH-A", "assessment")).toEqual(expect.arrayContaining([expect.objectContaining({ code: "school_code", severity: "fatal" })]));
  });

  it("accepts a valid assessment header and rejects a broken grade pair", () => {
    expect(validateAssessmentClassSheet([["BIL", "NAMA", "BM", "GRED"]], "1 A")).toEqual([]);
    expect(validateAssessmentClassSheet([["BIL", "NAMA", "BM", "MARKAH"]], "1 A")).toEqual(expect.arrayContaining([expect.objectContaining({ code: "grade_pair" })]));
  });

  it("accepts reordered PBD headers by name", () => {
    const headers = ["KELAS", "JUMLAH MURID", "TP 6", "TP 1", "TP 2", "TP 3", "TP 4", "TP 5", "BILANGAN MURID TIDAK DITAKSIR"];
    expect(validatePbdSubjectSheet([headers], "BM")).toEqual([]);
  });
});
