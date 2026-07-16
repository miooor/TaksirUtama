import type { UpsaClassAnalysis, UpsaClassResult } from "@/types/upsa";
import { getRequiredUpsaMarkCells, isExclusiveChoiceSubject } from "@/lib/upsa/subjectPolicy";

export function calculateUpsaClassAnalysis(result: UpsaClassResult): UpsaClassAnalysis {
  const averages = result.students.map((student) => student.average).filter((value): value is number => value !== null);
  const subjectBuckets = new Map<string, number[]>();
  const subjectGrades = new Map<string, Record<string, number>>();
  const subjectEnteredCounts = new Map<string, number>();
  const subjectMissingCounts = new Map<string, number>();
  const subjectAbsentCounts = new Map<string, number>();
  const overallGradeDistribution: Record<string, number> = {};

  for (const student of result.students) {
    for (const subject of student.subjects) {
      if (subject.mark !== null) {
        subjectBuckets.set(subject.subjectCode, [...(subjectBuckets.get(subject.subjectCode) ?? []), subject.mark]);
        if (isExclusiveChoiceSubject(subject.subjectCode)) {
          subjectEnteredCounts.set(subject.subjectCode, (subjectEnteredCounts.get(subject.subjectCode) ?? 0) + 1);
        }
      } else if (isExclusiveChoiceSubject(subject.subjectCode) && subject.status === "absent") {
        subjectAbsentCounts.set(subject.subjectCode, (subjectAbsentCounts.get(subject.subjectCode) ?? 0) + 1);
      }
      if (subject.grade) {
        overallGradeDistribution[subject.grade] = (overallGradeDistribution[subject.grade] ?? 0) + 1;
        const grades = subjectGrades.get(subject.subjectCode) ?? {};
        grades[subject.grade] = (grades[subject.grade] ?? 0) + 1;
        subjectGrades.set(subject.subjectCode, grades);
      }
    }

    for (const cell of getRequiredUpsaMarkCells(student.subjects)) {
      if (cell.status === "marked") {
        subjectEnteredCounts.set(cell.subjectCode, (subjectEnteredCounts.get(cell.subjectCode) ?? 0) + 1);
      } else if (cell.status === "missing") {
        subjectMissingCounts.set(cell.subjectCode, (subjectMissingCounts.get(cell.subjectCode) ?? 0) + 1);
      } else {
        subjectAbsentCounts.set(cell.subjectCode, (subjectAbsentCounts.get(cell.subjectCode) ?? 0) + 1);
      }
    }
  }

  // Academic analysis must stay at the real subject level. The synthetic
  // BA/BTSK/BCSK and PAI/MORAL codes are only required-cell groupings used by
  // readiness and missing-mark checks.
  const subjectCodes = [...new Set(result.students.flatMap((student) => student.subjects.map((subject) => subject.subjectCode)))];
  const subjectAnalyses = subjectCodes.map((subjectCode) => {
    const marks = subjectBuckets.get(subjectCode) ?? [];
    const gradeDistribution = subjectGrades.get(subjectCode) ?? {};
    const enteredCount = subjectEnteredCounts.get(subjectCode) ?? 0;
    const missingCount = subjectMissingCounts.get(subjectCode) ?? 0;
    const absentCount = subjectAbsentCounts.get(subjectCode) ?? 0;
    const passCount = marks.filter((mark) => mark >= 35).length;
    const failCount = marks.filter((mark) => mark < 35).length;
    return {
      subjectCode,
      enteredCount,
      missingCount,
      absentCount,
      average: marks.length ? marks.reduce((sum, value) => sum + value, 0) / marks.length : null,
      highestMark: marks.length ? Math.max(...marks) : null,
      lowestMark: marks.length ? Math.min(...marks) : null,
      passCount,
      failCount,
      passPercentage: marks.length ? (passCount / marks.length) * 100 : null,
      gradeDistribution,
    };
  });

  return {
    className: result.className,
    pupilCount: result.students.length,
    pupilsWithMarks: result.students.filter((student) => student.validSubjectCount > 0).length,
    pupilsWithMissingMarks: result.students.filter((student) => student.missingSubjects.length > 0).length,
    classAverage: averages.length ? averages.reduce((sum, value) => sum + value, 0) / averages.length : null,
    highestAverage: averages.length ? Math.max(...averages) : null,
    lowestAverage: averages.length ? Math.min(...averages) : null,
    subjectAverages: Object.fromEntries(
      [...subjectBuckets.entries()].map(([subject, marks]) => [subject, marks.reduce((sum, value) => sum + value, 0) / marks.length]),
    ),
    subjectAnalyses,
    overallGradeDistribution,
    missingMarks: result.students
      .filter((student) => student.missingSubjects.length > 0)
      .map((student) => ({ studentName: student.name, subjects: student.missingSubjects })),
    absentPupils: result.students
      .filter((student) => student.absentSubjects.length > 0)
      .map((student) => ({ studentName: student.name, subjects: student.absentSubjects })),
    interventionPupils: result.students.filter(
      (student) =>
        (student.average === null && student.missingSubjects.length > 0) ||
        (student.average ?? Number.POSITIVE_INFINITY) < 40 ||
        student.subjects.some((subject) => ["BM", "BI", "MATE", "SAINS"].includes(subject.subjectCode) && subject.grade === "F"),
    ),
    highAchievers: result.students.filter((student) => student.average !== null && student.average >= 80),
  };
}
