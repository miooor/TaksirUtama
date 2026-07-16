import { describe, expect, it } from "vitest";
import { parseUpsaClassSheet } from "@/lib/upsa/parseUpsaClassSheet";

describe("parseUpsaClassSheet", () => {
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
});
