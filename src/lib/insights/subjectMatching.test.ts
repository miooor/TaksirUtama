import { describe, expect, it } from "vitest";
import { resolveAssessmentSubjectCode, resolvePbdSubjectCode } from "@/lib/insights/subjectMatching";

describe("resolvePbdSubjectCode", () => {
  const pbdSubjectCodes = ["BM", "MATE", "B.ARAB", "B.TAMIL", "B.CHINA", "P.ISLAM", "P.MORAL", "PJK"];

  it("keeps exact PBD subject matches", () => {
    expect(resolvePbdSubjectCode("BM", pbdSubjectCodes)).toBe("BM");
    expect(resolvePbdSubjectCode("MATE", pbdSubjectCodes)).toBe("MATE");
  });

  it("maps UPSA language codes to PBD language tab codes", () => {
    expect(resolvePbdSubjectCode("BA", pbdSubjectCodes)).toBe("B.ARAB");
    expect(resolvePbdSubjectCode("BTSK", pbdSubjectCodes)).toBe("B.TAMIL");
    expect(resolvePbdSubjectCode("BCSK", pbdSubjectCodes)).toBe("B.CHINA");
  });

  it("maps UPSA religion and moral codes to PBD tab codes", () => {
    expect(resolvePbdSubjectCode("PAI", pbdSubjectCodes)).toBe("P.ISLAM");
    expect(resolvePbdSubjectCode("MORAL", pbdSubjectCodes)).toBe("P.MORAL");
  });

  it("maps UPSA Pendidikan Kesihatan to the PBD PJK subject", () => {
    expect(resolvePbdSubjectCode("PK", pbdSubjectCodes)).toBe("PJK");
  });

  it("returns null when neither an exact match nor alias exists", () => {
    expect(resolvePbdSubjectCode("SEJARAH", pbdSubjectCodes)).toBeNull();
  });
});

describe("resolveAssessmentSubjectCode", () => {
  it("matches direct and aliased PBD subject codes back to assessment codes", () => {
    expect(resolveAssessmentSubjectCode("BM", ["BM", "BI"])).toBe("BM");
    expect(resolveAssessmentSubjectCode("P.ISLAM", ["BM", "PAI"])).toBe("PAI");
    expect(resolveAssessmentSubjectCode("P.MORAL", ["MORAL", "PAI"])).toBe("MORAL");
    expect(resolveAssessmentSubjectCode("PJK", ["BM", "PK"])).toBe("PK");
    expect(resolveAssessmentSubjectCode("RBT", ["BM", "BI"])).toBeNull();
  });
});
