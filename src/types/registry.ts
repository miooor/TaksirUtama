export type StudentMatchStatus = "matched" | "unmatched" | "ambiguous";

export type AssessmentPupilReference = {
  studentId: string | null;
  classEnrollmentId: string | null;
  matchStatus: StudentMatchStatus;
};

export type SchoolStudent = {
  id: string;
  pupilCode: string | null;
  displayName: string;
  normalizedName: string;
  active: boolean;
};

export type StudentClassEnrollment = {
  id: string;
  studentId: string;
  classId: string;
  className: string;
  academicYearId: string;
  rosterNumber: number | null;
  active: boolean;
  student: SchoolStudent;
};

export type SchoolRegistry = {
  schoolId: string;
  year: string;
  academicYearId: string | null;
  students: SchoolStudent[];
  enrollments: StudentClassEnrollment[];
};

export type RosterImportRow = {
  rowNumber: number;
  pupilCode: string | null;
  displayName: string;
  className: string;
  rosterNumber: number | null;
};

export type RosterPreviewRow = RosterImportRow & {
  classId: string | null;
  studentId: string | null;
  enrollmentId: string | null;
  status: "create" | "match" | "warning" | "error";
  message: string;
};

export type RosterImportPreview = {
  rows: RosterPreviewRow[];
  createCount: number;
  matchCount: number;
  warningCount: number;
  errorCount: number;
};
