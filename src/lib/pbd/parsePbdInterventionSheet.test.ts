import { describe, expect, it } from "vitest";
import { parsePbdInterventionSheet } from "@/lib/pbd/parsePbdInterventionSheet";

describe("parsePbdInterventionSheet", () => {
  it("reads a standard intervention block and excludes malformed rows", () => {
    const result = parsePbdInterventionSheet([
      [],
      ["INTERVENSI MURID TP 1 DAN 2"],
      ["BIL", "NAMA MURID", "KELAS", "TP", "MASALAH", "INTERVENSI"],
      [1, "  Ali   Ahmad ", "4 Angsana", 1, "Reading fluency", "Guided reading"],
      [2, "JUMLAH", "", "", "", ""],
      [3, "Siti", "4 Angsana", 2, "", "Small-group practice"],
      [],
    ], "BM");

    expect(result.entries).toEqual([
      expect.objectContaining({
        subjectCode: "BM",
        studentName: "Ali Ahmad",
        normalizedStudentName: "ALI AHMAD",
        className: "4 Angsana",
        year: 4,
        tp: 1,
      }),
    ]);
    expect(result.issues).toEqual([
      expect.objectContaining({ rowNumber: 5 }),
      expect.objectContaining({ rowNumber: 6 }),
    ]);
  });

  it("handles shifted title and header columns", () => {
    const result = parsePbdInterventionSheet([
      ["INTERVENSI MURID TP 1 DAN 2"],
      ["", "KELAS", "NAMA MURID", "MASALAH", "TP", "INTERVENSI"],
      ["", "5 Bakawali", "Nur Aina", "Number facts", 2, "Daily drills"],
    ], "P.ISLAM");

    expect(result.entries).toEqual([
      expect.objectContaining({
        subjectCode: "P.ISLAM",
        studentName: "Nur Aina",
        className: "5 Bakawali",
        tp: 2,
      }),
    ]);
    expect(result.issues).toEqual([]);
  });

  it("accepts numeric and labelled TP1/TP2 values", () => {
    const result = parsePbdInterventionSheet([
      ["INTERVENSI MURID TP 1 DAN 2"],
      ["BIL", "NAMA MURID", "KELAS", "TP", "MASALAH", "INTERVENSI"],
      [1, "Pupil One", "4 Angsana", 1, "Problem", "Intervention"],
      [2, "Pupil Two", "4 Angsana", 2, "Problem", "Intervention"],
      [3, "Pupil Three", "4 Angsana", "TP1", "Problem", "Intervention"],
      [4, "Pupil Four", "4 Angsana", "TP2", "Problem", "Intervention"],
      [5, "Pupil Five", "4 Angsana", "TP 1", "Problem", "Intervention"],
      [6, "Pupil Six", "4 Angsana", "TP 2", "Problem", "Intervention"],
      [7, "Pupil Seven", "4 Angsana", "TP3", "Problem", "Intervention"],
    ], "MATE");

    expect(result.entries.map((entry) => entry.tp)).toEqual([1, 2, 1, 2, 1, 2]);
    expect(result.issues).toEqual([
      expect.objectContaining({ studentName: "Pupil Seven", reason: "Baris murid tidak lengkap atau tidak sah" }),
    ]);
  });

  it("keeps MATE screenshot-style TP rows with masalah and intervensi as valid entries", () => {
    const result = parsePbdInterventionSheet([
      ["INTERVENSI MURID TP 1 DAN 2"],
      ["NAMA MURID", "KELAS", "TP", "MASALAH", "INTERVENSI"],
      [
        "MUHAMMAD AMINUDDIN BIN SHAMSUL KADIR",
        "4 ANGSANA",
        "TP1",
        "MURID TIDAK MENGUASAI ASAS NOMBOR DAN OPERASI ASAS SERTA TIDAK BOLEH MENYALIN DENGAN BETUL.",
        "MURID DIBIMBING MENYALIN NOMBOR DENGAN BETUL DAN DIAJAR ASAS NOMBOR.",
      ],
      [
        "ARMIN HARRIS BIN MOHD DOM",
        "4 ANGSANA",
        "TP2",
        "MURID LEMAH DALAM MENYUSUN NILAI NOMBOR DAN TIDAK MENGUASAI KEMAHIRAN ASAS.",
        "MURID DIBIMBING MENGUASAI BERMULA DENGAN NOMBOR YANG LEBIH KECIL SECARA PENGULANGAN.",
      ],
    ], "MATE");

    expect(result.issues).toEqual([]);
    expect(result.entries).toEqual([
      expect.objectContaining({
        subjectCode: "MATE",
        studentName: "MUHAMMAD AMINUDDIN BIN SHAMSUL KADIR",
        className: "4 ANGSANA",
        tp: 1,
      }),
      expect.objectContaining({
        subjectCode: "MATE",
        studentName: "ARMIN HARRIS BIN MOHD DOM",
        className: "4 ANGSANA",
        tp: 2,
      }),
    ]);
  });
});
