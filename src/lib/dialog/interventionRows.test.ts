import { describe, expect, it } from "vitest";
import { buildDialogInterventionCsvRows, buildDialogInterventionRows } from "@/lib/dialog/interventionRows";
import { classifyInterventionTheme } from "@/lib/dialog/interventionTheme";
import type { PbdInterventionEntry } from "@/types/intervention";

describe("dialog intervention helpers", () => {
  it("classifies issue themes from problem and intervention text", () => {
    expect(classifyInterventionTheme("Tidak hadir kelas", "")).toBe("Kehadiran");
    expect(classifyInterventionTheme("Lemah membaca petikan", "")).toBe("Literasi");
    expect(classifyInterventionTheme("Tidak menguasai sifir", "")).toBe("Numerasi");
    expect(classifyInterventionTheme("Kerja rumah tidak lengkap", "")).toBe("Kerja Tidak Lengkap");
    expect(classifyInterventionTheme("Kurang fokus semasa PdP", "")).toBe("Fokus/Sikap");
    expect(classifyInterventionTheme("Perlu bimbingan umum", "")).toBe("Lain-lain");
  });

  it("builds intervention rows with repeated-risk labels and CSV fields", () => {
    const rows = buildDialogInterventionRows([
      entry("BM", "Ali Ahmad", "5 Angsana", 1, "Lemah membaca"),
      entry("BI", "Ali Ahmad", "5 Angsana", 2, "Kerja rumah tidak lengkap"),
      entry("MATE", "Siti Noor", "5 Bakawali", 2, "Tidak menguasai sifir"),
    ]);
    const csvRows = buildDialogInterventionCsvRows(rows.filter((row) => row.year === 5 && row.subjectCode === "BM"));

    expect(rows[0]).toMatchObject({
      studentName: "Ali Ahmad",
      repeatedRisk: true,
      priorityLabel: "Segera",
    });
    expect(csvRows).toEqual([
      expect.objectContaining({
        Tahun: 5,
        Kelas: "5 Angsana",
        Murid: "Ali Ahmad",
        Subjek: "BM",
        Tema: "Literasi",
        Pemilik: "KP",
        "Risiko Berulang": "Ya",
      }),
    ]);
  });
});

function entry(subjectCode: string, studentName: string, className: string, tp: 1 | 2, problem: string): PbdInterventionEntry {
  return {
    subjectCode,
    studentName,
    normalizedStudentName: studentName.toUpperCase(),
    className,
    normalizedClassName: className.toUpperCase(),
    year: Number(className[0]),
    tp,
    problem,
    intervention: "Intervensi berfokus",
  };
}
