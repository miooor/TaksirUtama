import { calculateUpsaClassAnalysis } from "@/lib/upsa/calculateUpsaClassAnalysis";
import type { UpsaClassResult } from "@/types/upsa";

export const dialogPrestasiGrades = ["A", "B", "C", "D", "E", "F"] as const;

export type DialogPrestasiUpsaClassComparison = {
  className: string;
  enteredCount: number;
  absentCount: number;
  gradeDistribution: Record<string, number>;
};

export type DialogPrestasiUpsaLevelComparison = {
  level: string;
  classes: DialogPrestasiUpsaClassComparison[];
};

export type DialogPrestasiUpsaSubjectReport = {
  calendarYear: string;
  assessmentLabel: string;
  assessmentName: string;
  subjectCode: string;
  pbdSubjectCode: string;
  subjectName: string;
  levels: DialogPrestasiUpsaLevelComparison[];
};

export function buildDialogPrestasiUpsaSubjectReport({
  calendarYear,
  assessmentLabel,
  assessmentName,
  subjectCode,
  pbdSubjectCode,
  results,
}: {
  calendarYear: string;
  assessmentLabel: string;
  assessmentName: string;
  subjectCode: string;
  pbdSubjectCode: string;
  results: UpsaClassResult[];
}): DialogPrestasiUpsaSubjectReport {
  const classAnalyses = results.map((result) => ({ result, analysis: calculateUpsaClassAnalysis(result) }));
  const subjectName = results
    .flatMap((result) => result.students)
    .flatMap((student) => student.subjects)
    .find((subject) => subject.subjectCode === subjectCode)?.subjectName ?? subjectCode;

  return {
    calendarYear,
    assessmentLabel,
    assessmentName,
    subjectCode,
    pbdSubjectCode,
    subjectName,
    levels: ["4", "5", "6"].map((level) => ({
      level,
      classes: classAnalyses
        .filter(({ result }) => result.className.startsWith(`${level} `))
        .map(({ analysis }) => {
          const subject = analysis.subjectAnalyses.find((item) => item.subjectCode === subjectCode);
          return {
            className: analysis.className,
            enteredCount: subject?.enteredCount ?? 0,
            absentCount: subject?.absentCount ?? 0,
            gradeDistribution: subject?.gradeDistribution ?? {},
          };
        })
        .sort((a, b) => a.className.localeCompare(b.className, "ms")),
    })),
  };
}
