export type UpsaSubjectResult = {
  subjectCode: string;
  subjectName: string;
  mark: number | null;
  maxMark: number;
  grade: string | null;
  status: "marked" | "missing" | "absent";
};

import type { StudentMatchStatus } from "@/types/registry";

export type UpsaStudentResult = {
  id: string;
  bil: string;
  name: string;
  className: string;
  teacherName: string;
  subjects: UpsaSubjectResult[];
  average: number | null;
  totalMarks: number | null;
  validSubjectCount: number;
  missingSubjects: string[];
  absentSubjects: string[];
  studentId: string | null;
  enrollmentId: string | null;
  matchStatus: StudentMatchStatus;
};

export type UpsaClassResult = {
  assessmentName?: string;
  schoolCode?: string;
  className: string;
  teacherName: string;
  headteacherName?: string;
  students: UpsaStudentResult[];
};

export type UpsaClassAnalysis = {
  className: string;
  pupilCount: number;
  pupilsWithMarks: number;
  pupilsWithMissingMarks: number;
  classAverage: number | null;
  highestAverage: number | null;
  lowestAverage: number | null;
  subjectAverages: Record<string, number>;
  subjectAnalyses: Array<{
    subjectCode: string;
    enteredCount: number;
    missingCount: number;
    absentCount: number;
    average: number | null;
    highestMark: number | null;
    lowestMark: number | null;
    passCount: number;
    failCount: number;
    passPercentage: number | null;
    gradeDistribution: Record<string, number>;
  }>;
  overallGradeDistribution: Record<string, number>;
  missingMarks: Array<{ studentName: string; subjects: string[] }>;
  absentPupils: Array<{ studentName: string; subjects: string[] }>;
  interventionPupils: UpsaStudentResult[];
  highAchievers: UpsaStudentResult[];
};

export type UpsaYearAnalysis = {
  year: string;
  classCount: number;
  pupilCount: number;
  pupilsWithMarks: number;
  pupilsWithMissingMarks: number;
  yearAverage: number | null;
  subjectAnalyses: UpsaClassAnalysis["subjectAnalyses"];
  subjectClassGradeComparisons: Array<{
    subjectCode: string;
    classes: Array<{
      className: string;
    enteredCount: number;
    gradeDistribution: Record<string, number>;
  }>;
  }>;
  overallGradeDistribution: Record<string, number>;
  classGradeComparisons: Array<{
    className: string;
    pupilCount: number;
    enteredCount: number;
    absentCount: number;
    gradeDistribution: Record<string, number>;
  }>;
  missingMarks: Array<{ studentName: string; className: string; subjects: string[] }>;
  absentPupils: Array<{ studentName: string; className: string; subjects: string[] }>;
  interventionPupils: UpsaStudentResult[];
  highAchievers: UpsaStudentResult[];
  classSummaries: Array<{
    className: string;
    pupilCount: number;
    classAverage: number | null;
    interventionCount: number;
  }>;
};
