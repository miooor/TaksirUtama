import type { UpsaClassResult, UpsaYearAnalysis } from "@/types/upsa";
import { calculateUpsaClassAnalysis } from "@/lib/upsa/calculateUpsaClassAnalysis";
import { getRequiredUpsaMarkCells, isExclusiveChoiceSubject } from "@/lib/upsa/subjectPolicy";

export function calculateUpsaYearAnalysis(year: string, results: UpsaClassResult[]): UpsaYearAnalysis {
  const classAnalyses = results.map((result) => calculateUpsaClassAnalysis(result));
  const students = results.flatMap((result) => result.students);
  const averages = students.map((student) => student.average).filter((value): value is number => value !== null);
  const subjectBuckets = new Map<string, number[]>();
  const subjectGrades = new Map<string, Record<string, number>>();
  const subjectEnteredCounts = new Map<string, number>();
  const subjectMissingCounts = new Map<string, number>();
  const subjectAbsentCounts = new Map<string, number>();
  const overallGradeDistribution: Record<string, number> = {};

  for (const student of students) {
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

  // Keep synthetic exclusive-choice group codes out of academic analysis.
  // They remain available through readiness and missing-mark calculations.
  const subjectCodes = [...new Set(students.flatMap((student) => student.subjects.map((subject) => subject.subjectCode)))];
  const subjectAnalyses = subjectCodes.map((subjectCode) => {
    const marks = subjectBuckets.get(subjectCode) ?? [];
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
      gradeDistribution: subjectGrades.get(subjectCode) ?? {},
    };
  });
  const subjectClassGradeComparisons = subjectCodes.map((subjectCode) => ({
    subjectCode,
    classes: classAnalyses.map((analysis) => {
      const subject = analysis.subjectAnalyses.find((item) => item.subjectCode === subjectCode);
      return {
        className: analysis.className,
        enteredCount: subject?.enteredCount ?? 0,
        gradeDistribution: subject?.gradeDistribution ?? {},
      };
    }),
  }));

  return {
    year,
    classCount: results.length,
    pupilCount: students.length,
    pupilsWithMarks: students.filter((student) => student.validSubjectCount > 0).length,
    pupilsWithMissingMarks: students.filter((student) => student.missingSubjects.length > 0).length,
    yearAverage: averages.length ? averages.reduce((sum, value) => sum + value, 0) / averages.length : null,
    subjectAnalyses,
    subjectClassGradeComparisons,
    overallGradeDistribution,
    classGradeComparisons: classAnalyses.map((analysis) => ({
      className: analysis.className,
      pupilCount: analysis.pupilCount,
      enteredCount: analysis.subjectAnalyses.reduce((sum, subject) => sum + subject.enteredCount, 0),
      absentCount: analysis.subjectAnalyses.reduce((sum, subject) => sum + subject.absentCount, 0),
      gradeDistribution: analysis.overallGradeDistribution,
    })),
    missingMarks: students
      .filter((student) => student.missingSubjects.length > 0)
      .map((student) => ({ studentName: student.name, className: student.className, subjects: student.missingSubjects })),
    absentPupils: students
      .filter((student) => student.absentSubjects.length > 0)
      .map((student) => ({ studentName: student.name, className: student.className, subjects: student.absentSubjects })),
    interventionPupils: students.filter(
      (student) =>
        (student.average === null && student.missingSubjects.length > 0) ||
        (student.average ?? Number.POSITIVE_INFINITY) < 40 ||
        student.subjects.some((subject) => ["BM", "BI", "MATE", "SAINS"].includes(subject.subjectCode) && subject.grade === "F"),
    ),
    highAchievers: students.filter((student) => student.average !== null && student.average >= 80),
    classSummaries: classAnalyses.map((analysis) => ({
      className: analysis.className,
      pupilCount: analysis.pupilCount,
      classAverage: analysis.classAverage,
      interventionCount: analysis.interventionPupils.length,
    })),
  };
}
