import { describe, expect, it } from "vitest";
import { buildProgressModel, type ProgressInput } from "./buildProgressModel";

function classResults(students: Array<{ id: string; name: string; className: string; subjects: Array<{ code: string; mark: number | null; maxMark?: number; status?: "marked" | "missing" | "absent" }> }>) {
  return [{
    className: students[0]?.className ?? "4 Angsana",
    students: students.map((s) => ({
      studentId: s.id,
      name: s.name,
      className: s.className,
      subjects: s.subjects.map((sub) => ({
        subjectCode: sub.code,
        mark: sub.mark,
        maxMark: sub.maxMark ?? 100,
        status: sub.status ?? "marked",
      })),
    })),
  }];
}

function pbdRecords(records: Array<{ className: string; subjectCode: string; tp1?: number; tp2?: number; tp3?: number; tp4?: number; tp5?: number; tp6?: number; total?: number; notAssessed?: number }>) {
  return records.map((r) => ({
    className: r.className,
    subjectCode: r.subjectCode,
    tpCounts: { TP1: r.tp1 ?? 2, TP2: r.tp2 ?? 3, TP3: r.tp3 ?? 10, TP4: r.tp4 ?? 8, TP5: r.tp5 ?? 5, TP6: r.tp6 ?? 2 },
    totalPupils: r.total ?? 30,
    notAssessedCount: r.notAssessed ?? 0,
  }));
}

const baseInput: ProgressInput = {
  year: "2026",
  level: null,
  upsaClassResults: classResults([
    { id: "s1", name: "Ali", className: "4 Angsana", subjects: [{ code: "BM", mark: 70 }] },
    { id: "s2", name: "Siti", className: "4 Angsana", subjects: [{ code: "BM", mark: 60 }] },
  ]),
  uasaClassResults: classResults([
    { id: "s1", name: "Ali", className: "4 Angsana", subjects: [{ code: "BM", mark: 80 }] },
    { id: "s2", name: "Siti", className: "4 Angsana", subjects: [{ code: "BM", mark: 55 }] },
  ]),
  pbdSem1Records: pbdRecords([{ className: "4 Angsana", subjectCode: "BM" }]),
  pbdSem2Records: pbdRecords([{ className: "4 Angsana", subjectCode: "BM", tp1: 1, tp2: 1, tp5: 7, tp6: 4 }]),
};

describe("buildProgressModel", () => {
  it("builds a complete model with all data sources", () => {
    const model = buildProgressModel(baseInput);
    expect(model.year).toBe("2026");
    expect(model.level).toBeNull();
    expect(model.pupilMovements).toHaveLength(2);
    expect(model.classMovements.length).toBeGreaterThan(0);
    expect(model.subjectMovements.length).toBeGreaterThan(0);
    expect(model.schoolMovement).not.toBeNull();
    expect(model.pbdMovements).toHaveLength(1);
    expect(model.evidenceRows.length).toBeGreaterThan(0);
    expect(model.warnings).toHaveLength(0);
  });

  it("produces warnings when UASA is missing", () => {
    const model = buildProgressModel({ ...baseInput, uasaClassResults: null });
    expect(model.warnings.length).toBeGreaterThan(0);
    expect(model.pupilMovements).toHaveLength(0);
    expect(model.pbdMovements).toHaveLength(1); // PBD still works
  });

  it("produces warnings when both assessments are missing", () => {
    const model = buildProgressModel({ ...baseInput, upsaClassResults: null, uasaClassResults: null });
    expect(model.warnings.length).toBeGreaterThan(0);
    expect(model.pupilMovements).toHaveLength(0);
  });

  it("produces warnings when PBD sem2 is missing", () => {
    const model = buildProgressModel({ ...baseInput, pbdSem2Records: null });
    expect(model.warnings.some((w) => w.includes("Semester 2"))).toBe(true);
    expect(model.pbdMovements).toHaveLength(0);
    expect(model.pupilMovements).toHaveLength(2); // Exam still works
  });

  it("filters by level when specified", () => {
    const model = buildProgressModel({ ...baseInput, level: 4 });
    expect(model.level).toBe(4);
    expect(model.pupilMovements).toHaveLength(2); // Both in year 4

    const model5 = buildProgressModel({ ...baseInput, level: 5 });
    expect(model5.pupilMovements).toHaveLength(0); // None in year 5
  });

  it("handles empty cohorts gracefully", () => {
    const model = buildProgressModel({
      year: "2026",
      level: null,
      upsaClassResults: [],
      uasaClassResults: [],
      pbdSem1Records: [],
      pbdSem2Records: [],
    });
    expect(model.pupilMovements).toHaveLength(0);
    expect(model.evidenceRows).toHaveLength(0);
    expect(model.schoolMovement).toBeNull();
  });

  it("handles unmatched pupils (no studentId)", () => {
    const input: ProgressInput = {
      ...baseInput,
      upsaClassResults: classResults([
        { id: "", name: "Unknown", className: "4 Angsana", subjects: [{ code: "BM", mark: 70 }] },
      ]),
      uasaClassResults: classResults([
        { id: "", name: "Unknown", className: "4 Angsana", subjects: [{ code: "BM", mark: 80 }] },
      ]),
    };
    // studentId is empty string which is falsy → unmatched
    const model = buildProgressModel(input);
    expect(model.coverage.unmatched).toBeGreaterThan(0);
  });

  it("coverage reflects matched vs total", () => {
    const model = buildProgressModel(baseInput);
    expect(model.coverage.matchedInBoth).toBe(2);
    expect(model.coverage.totalEnrolled).toBe(2);
  });
});
