import { describe, expect, it } from "vitest";
import { hydrateExpectedSubjects } from "@/lib/db/assessmentResults";
import { calculateUpsaReadiness } from "@/lib/upsa/readiness";
import type { UpsaClassResult, UpsaStudentResult, UpsaSubjectResult } from "@/types/upsa";

function marked(subjectCode: string, mark: number): UpsaSubjectResult {
  return { subjectCode, subjectName: subjectCode, mark, maxMark: 100, grade: "A", status: "marked" };
}

function student(subjects: UpsaSubjectResult[]): UpsaStudentResult {
  const valid = subjects.filter((subject) => subject.mark !== null);
  return {
    id: "4 Angsana-1",
    bil: "1",
    name: "Murid Contoh",
    className: "4 Angsana",
    teacherName: "",
    subjects,
    average: null,
    totalMarks: null,
    validSubjectCount: valid.length,
    missingSubjects: [],
    absentSubjects: [],
    studentId: "s1",
    enrollmentId: "e1",
    matchStatus: "matched",
  };
}

describe("hydrateExpectedSubjects", () => {
  it("adds unentered class subjects as missing so readiness does not report false completion", () => {
    const pupils = [student([marked("BM", 80)])];
    hydrateExpectedSubjects(pupils, ["BM", "BI", "MATE"], []);

    const codes = pupils[0]!.subjects.map((subject) => subject.subjectCode).sort();
    expect(codes).toEqual(["BI", "BM", "MATE"]);
    expect(pupils[0]!.subjects.find((subject) => subject.subjectCode === "BI")?.status).toBe("missing");
    expect(pupils[0]!.subjects.find((subject) => subject.subjectCode === "MATE")?.status).toBe("missing");
    expect([...pupils[0]!.missingSubjects].sort()).toEqual(["BI", "MATE"]);

    const classResult: UpsaClassResult = { className: "4 Angsana", teacherName: "", students: pupils };
    const readiness = calculateUpsaReadiness([classResult]);
    expect(readiness.subjectReadiness.find((subject) => subject.subjectCode === "BI")?.status).toBe("Belum diisi");
    expect(readiness.subjectReadiness.find((subject) => subject.subjectCode === "MATE")?.status).toBe("Belum diisi");
    expect(readiness.completionPercentage).toBeLessThan(100);
  });

  it("does not duplicate subjects that already have stored results", () => {
    const pupils = [student([marked("BM", 80)])];
    hydrateExpectedSubjects(pupils, ["BM"], []);
    expect(pupils[0]!.subjects.filter((subject) => subject.subjectCode === "BM")).toHaveLength(1);
  });

  it("uses exclusive-choice-aware missing lists for hydrated religion/moral subjects", () => {
    // PAI is marked, MORAL is hydrated as missing. The missing list must not
    // expose MORAL individually nor the PAI/MORAL group code (group is marked).
    const pupils = [student([marked("PAI", 70)])];
    hydrateExpectedSubjects(pupils, ["PAI", "MORAL"], []);
    expect(pupils[0]!.missingSubjects).not.toContain("MORAL");
    expect(pupils[0]!.missingSubjects).not.toContain("PAI/MORAL");
  });
});
