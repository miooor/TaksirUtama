import { describe, expect, it } from "vitest";
import { parseUpsaClassSheet } from "@/lib/upsa/parseUpsaClassSheet";
import type { SchoolRegistry } from "@/types/registry";

describe("parseUpsaClassSheet", () => {
  it("parses the row 6-10 class metadata and accepts SUBJEK as the pupil-name column header", () => {
    const result = parseUpsaClassSheet([
      [], [], [], [], [],
      ["PENTAKSIRAN", "UPSA"],
      ["KOD SEKOLAH", "BBB8314"],
      ["KELAS :", "4 ANGSANA"],
      ["NAMA GURU KELAS :", "NORFARAHANI BINTI MAD DAHARI"],
      ["NAMA GURU BESAR:", "SHAMSINAR HAYATI BINTI MOHD SHITH"],
      ["BIL", "SUBJEK", "BM", "GRED"],
      ["", "", 100, ""],
      [1, "MURID CONTOH", 82, "A"],
    ], "KELAS SANDARAN");

    expect(result).toMatchObject({
      assessmentName: "UPSA",
      schoolCode: "BBB8314",
      className: "4 ANGSANA",
      teacherName: "NORFARAHANI BINTI MAD DAHARI",
      headteacherName: "SHAMSINAR HAYATI BINTI MOHD SHITH",
    });
    expect(result.students).toHaveLength(1);
    expect(result.students[0]).toMatchObject({ bil: "1", name: "MURID CONTOH" });
  });

  it("treats BA, BTSK, and BCSK as one required alternative-language subject", () => {
    const result = parseUpsaClassSheet([
      ["BIL", "NAMA", "BM", "GRED", "BA", "GRED", "BTSK", "GRED", "BCSK", "GRED", "MATE", "GRED"],
      ["", "", 100, "", 100, "", 100, "", 100, "", 100, ""],
      [1, "BA Pupil", 80, "A", 76, "B", "", "", "", "", 90, "A"],
      [2, "BTSK Pupil", 80, "A", "", "", 76, "B", "", "", 90, "A"],
      [3, "BCSK Pupil", 80, "A", "", "", "", "", 76, "B", 90, "A"],
      [4, "No Language Pupil", 80, "A", "", "", "", "", "", "", 90, "A"],
      [5, "Other Missing Pupil", "", "", 76, "B", "", "", "", "", 90, "A"],
    ], "4 ANGSANA");

    expect(result.students.find((student) => student.name === "BA Pupil")?.missingSubjects).not.toEqual(expect.arrayContaining(["BTSK", "BCSK"]));
    expect(result.students.find((student) => student.name === "BTSK Pupil")?.missingSubjects).not.toEqual(expect.arrayContaining(["BA", "BCSK"]));
    expect(result.students.find((student) => student.name === "BCSK Pupil")?.missingSubjects).not.toEqual(expect.arrayContaining(["BA", "BTSK"]));
    expect(result.students.find((student) => student.name === "No Language Pupil")?.missingSubjects).toEqual(["BA/BTSK/BCSK"]);
    expect(result.students.find((student) => student.name === "Other Missing Pupil")?.missingSubjects).toEqual(["BM"]);
  });

  it("treats PAI and MORAL as one required religion or moral subject", () => {
    const result = parseUpsaClassSheet([
      ["BIL", "NAMA", "BM", "GRED", "PAI", "GRED", "MORAL", "GRED", "MATE", "GRED"],
      ["", "", 100, "", 100, "", 100, "", 100, ""],
      [1, "PAI Pupil", 80, "A", 76, "B", "", "", 90, "A"],
      [2, "Moral Pupil", 80, "A", "", "", 76, "B", 90, "A"],
      [3, "No Religion Moral Pupil", 80, "A", "", "", "", "", 90, "A"],
      [4, "Other Missing Pupil", "", "", 76, "B", "", "", 90, "A"],
    ], "4 ANGSANA");

    expect(result.students.find((student) => student.name === "PAI Pupil")?.missingSubjects).not.toEqual(expect.arrayContaining(["MORAL"]));
    expect(result.students.find((student) => student.name === "Moral Pupil")?.missingSubjects).not.toEqual(expect.arrayContaining(["PAI"]));
    expect(result.students.find((student) => student.name === "No Religion Moral Pupil")?.missingSubjects).toEqual(["PAI/MORAL"]);
    expect(result.students.find((student) => student.name === "Other Missing Pupil")?.missingSubjects).toEqual(["BM"]);
  });

  it("parses TH labels as absent instead of missing marks", () => {
    const result = parseUpsaClassSheet([
      ["BIL", "NAMA", "BM", "GRED", "BI", "GRED", "MATE", "GRED"],
      ["", "", 100, "", 100, "", 100, ""],
      [1, "TH Pupil", "TH", "", "th", "", "Tak Hadir", ""],
      [2, "Blank Pupil", "", "", 80, "A", 90, "A"],
      [3, "Marked Pupil", 70, "B", 80, "A", 90, "A"],
    ], "4 ANGSANA");

    expect(result.students.find((student) => student.name === "TH Pupil")).toMatchObject({
      average: null,
      validSubjectCount: 0,
      missingSubjects: [],
      absentSubjects: ["BM", "BI", "MATE"],
    });
    expect(result.students.find((student) => student.name === "TH Pupil")?.subjects.map((subject) => subject.status)).toEqual(["absent", "absent", "absent"]);
    expect(result.students.find((student) => student.name === "Blank Pupil")).toMatchObject({
      missingSubjects: ["BM"],
      absentSubjects: [],
    });
    expect(result.students.find((student) => student.name === "Marked Pupil")?.subjects.map((subject) => subject.status)).toEqual(["marked", "marked", "marked"]);
  });

  describe("registry matching", () => {
    const registry: SchoolRegistry = {
      schoolId: "school-1",
      year: "2026",
      academicYearId: "ay-1",
      students: [
        { id: "s-1", pupilCode: "P001", displayName: "MURID CONTOH", normalizedName: "MURID CONTOH", active: true },
        { id: "s-2", pupilCode: "P002", displayName: "MURID LAIN", normalizedName: "MURID LAIN", active: true },
        { id: "s-3", pupilCode: "P003", displayName: "MURID KEMBAR", normalizedName: "MURID KEMBAR", active: true },
        { id: "s-4", pupilCode: "P004", displayName: "MURID KEMBAR", normalizedName: "MURID KEMBAR", active: true },
        { id: "s-5", pupilCode: "P005", displayName: "MURID TAK AKTIF", normalizedName: "MURID TAK AKTIF", active: false },
      ],
      enrollments: [
        { id: "e-1", studentId: "s-1", classId: "c-angsana", className: "4 ANGSANA", academicYearId: "ay-1", rosterNumber: 1, active: true, student: { id: "s-1", pupilCode: "P001", displayName: "MURID CONTOH", normalizedName: "MURID CONTOH", active: true } },
        { id: "e-2", studentId: "s-2", classId: "c-angsana", className: "4 ANGSANA", academicYearId: "ay-1", rosterNumber: 2, active: true, student: { id: "s-2", pupilCode: "P002", displayName: "MURID LAIN", normalizedName: "MURID LAIN", active: true } },
        { id: "e-3", studentId: "s-3", classId: "c-angsana", className: "4 ANGSANA", academicYearId: "ay-1", rosterNumber: 3, active: true, student: { id: "s-3", pupilCode: "P003", displayName: "MURID KEMBAR", normalizedName: "MURID KEMBAR", active: true } },
        { id: "e-4", studentId: "s-4", classId: "c-angsana", className: "4 ANGSANA", academicYearId: "ay-1", rosterNumber: 4, active: true, student: { id: "s-4", pupilCode: "P004", displayName: "MURID KEMBAR", normalizedName: "MURID KEMBAR", active: true } },
        { id: "e-5", studentId: "s-5", classId: "c-angsana", className: "4 ANGSANA", academicYearId: "ay-1", rosterNumber: 5, active: false, student: { id: "s-5", pupilCode: "P005", displayName: "MURID TAK AKTIF", normalizedName: "MURID TAK AKTIF", active: false } },
      ],
    };

    it("matches a student by normalized name", () => {
      const result = parseUpsaClassSheet([
        ["BIL", "SUBJEK", "BM", "GRED"],
        ["", "", 100, ""],
        [1, "Murid Contoh", 82, "A"],
      ], "4 ANGSANA", registry);

      expect(result.students[0]).toMatchObject({
        studentId: "s-1",
        enrollmentId: "e-1",
        matchStatus: "matched",
      });
    });

    it("marks unmatched when student not in registry", () => {
      const result = parseUpsaClassSheet([
        ["BIL", "SUBJEK", "BM", "GRED"],
        ["", "", 100, ""],
        [1, "MURID TIADA", 82, "A"],
      ], "4 ANGSANA", registry);

      expect(result.students[0]).toMatchObject({
        studentId: null,
        enrollmentId: null,
        matchStatus: "unmatched",
      });
    });

    it("marks ambiguous when two students share the same normalized name", () => {
      const result = parseUpsaClassSheet([
        ["BIL", "SUBJEK", "BM", "GRED"],
        ["", "", 100, ""],
        [1, "Murid Kembar", 82, "A"],
      ], "4 ANGSANA", registry);

      expect(result.students[0]).toMatchObject({
        studentId: null,
        enrollmentId: null,
        matchStatus: "ambiguous",
      });
    });

    it("ignores inactive enrollments", () => {
      const result = parseUpsaClassSheet([
        ["BIL", "SUBJEK", "BM", "GRED"],
        ["", "", 100, ""],
        [1, "Murid Tak Aktif", 82, "A"],
      ], "4 ANGSANA", registry);

      expect(result.students[0]).toMatchObject({
        studentId: null,
        enrollmentId: null,
        matchStatus: "unmatched",
      });
    });

    it("works without a registry (backward compat)", () => {
      const result = parseUpsaClassSheet([
        ["BIL", "SUBJEK", "BM", "GRED"],
        ["", "", 100, ""],
        [1, "MURID CONTOH", 82, "A"],
      ], "4 ANGSANA");

      expect(result.students[0]).toMatchObject({
        studentId: null,
        enrollmentId: null,
        matchStatus: "unmatched",
      });
    });
  });
});
