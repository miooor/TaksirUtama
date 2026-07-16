import { describe, expect, it } from "vitest";
import { calculateInterventionDashboardAnalysis, summarizeInterventionPupils } from "@/lib/pbd/intervention";
import type { PbdInterventionEntry } from "@/types/intervention";

const entries: PbdInterventionEntry[] = [
  entry("BM", "Ali Ahmad", "4 Angsana", 2),
  entry("BI", " ali   ahmad ", "4 Angsana", 1),
  entry("MATH", "Siti Noor", "4 Angsana", 2),
  entry("SCI", "Siti Noor", "4 Angsana", 2),
  entry("SEJ", "Ali Ahmad", "5 Bakawali", 2),
];

describe("intervention analysis", () => {
  it("groups normalized pupils, keeps classes separate, and assigns severity", () => {
    const pupils = summarizeInterventionPupils(entries);

    expect(pupils).toHaveLength(3);
    expect(pupils[0]).toMatchObject({
      studentName: "Ali Ahmad",
      className: "4 Angsana",
      subjectCount: 2,
      lowestTp: 1,
      priority: "high",
      severity: "urgent",
    });
    expect(pupils.find((item) => item.className === "5 Bakawali")).toMatchObject({
      subjectCount: 1,
      priority: "single-subject",
      severity: "monitor",
    });
    expect(pupils.find((item) => item.studentName === "Siti Noor")).toMatchObject({
      subjectCount: 2,
      priority: "high",
      severity: "coordinated",
    });
  });

  it("calculates class, subject, overlap, and urgent summaries", () => {
    const analysis = calculateInterventionDashboardAnalysis(entries);

    expect(analysis.uniquePupils).toBe(3);
    expect(analysis.highPriorityPupils).toBe(2);
    expect(analysis.urgentPupils).toBe(1);
    expect(analysis.classCounts[0]).toEqual({ className: "4 Angsana", pupilCount: 2 });
    expect(analysis.subjectCounts.map((item) => item.subjectCode)).toEqual(["BI", "BM", "MATH", "SCI", "SEJ"]);
    expect(analysis.overlapPairs).toEqual([
      { subjects: ["BI", "BM"], pupilCount: 1 },
      { subjects: ["MATH", "SCI"], pupilCount: 1 },
    ]);
  });

});

function entry(subjectCode: string, studentName: string, className: string, tp: 1 | 2): PbdInterventionEntry {
  const normalizedStudentName = studentName.trim().replace(/\s+/g, " ").toUpperCase();
  return {
    subjectCode,
    studentName: studentName.trim().replace(/\s+/g, " "),
    normalizedStudentName,
    className,
    normalizedClassName: className.toUpperCase(),
    year: Number(className[0]),
    tp,
    problem: "Problem",
    intervention: "Intervention",
  };
}
