import { randomUUID } from "node:crypto";
import type { ActorContext } from "@/lib/auth/actor";
import type { AssessmentPeriod } from "@/lib/config/periods";
import { getDatabase, isDatabaseConfigured } from "@/lib/db/client";
import { subjectDisplayName, type SchoolSubjectRecord } from "@/lib/subjects";
import { getAbsentUpsaSubjectCodes, getMissingUpsaSubjectCodes } from "@/lib/upsa/subjectPolicy";
import type { SchoolRegistry } from "@/types/registry";
import type { UpsaClassResult, UpsaStudentResult, UpsaSubjectResult } from "@/types/upsa";

export type AssessmentResultRow = {
  id: string;
  schoolId: string;
  academicYearId: string;
  assessmentType: string;
  classId: string;
  enrollmentId: string;
  studentId: string;
  subjectCode: string;
  mark: number | null;
  maxMark: number;
  grade: string | null;
  status: "marked" | "missing" | "absent";
  sourceSheet: string | null;
  sourceRow: number | null;
};

function rowFromDb(row: Record<string, unknown>): AssessmentResultRow {
  return {
    id: String(row.id),
    schoolId: String(row.school_id),
    academicYearId: String(row.academic_year_id),
    assessmentType: String(row.assessment_type),
    classId: String(row.class_id),
    enrollmentId: String(row.enrollment_id),
    studentId: String(row.student_id),
    subjectCode: String(row.subject_code),
    mark: row.mark === null || row.mark === undefined ? null : Number(row.mark),
    maxMark: Number(row.max_mark),
    grade: row.grade === null || row.grade === undefined ? null : String(row.grade),
    status: String(row.status) as AssessmentResultRow["status"],
    sourceSheet: row.source_sheet === null || row.source_sheet === undefined ? null : String(row.source_sheet),
    sourceRow: row.source_row === null || row.source_row === undefined ? null : Number(row.source_row),
  };
}

/**
 * Load school subjects for display name resolution.
 */
async function loadSchoolSubjects(schoolId: string): Promise<SchoolSubjectRecord[]> {
  if (!isDatabaseConfigured()) return [];
  const sql = getDatabase();
  const rows = await sql`SELECT id, code, name, aliases_json, active FROM school_subjects WHERE school_id = ${schoolId} AND active = true`;
  return rows.map((row) => ({
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    aliases: Array.isArray(row.aliases_json) ? (row.aliases_json as string[]) : [],
    active: Boolean(row.active),
  }));
}

/**
 * Load the active subject codes assigned to each class (class_subjects).
 * Used to hydrate partial DB snapshots so that subjects which have no
 * assessment_results rows yet are still represented as "missing".
 */
async function loadExpectedSubjectCodesByClass(schoolId: string): Promise<Map<string, string[]>> {
  if (!isDatabaseConfigured()) return new Map();
  const sql = getDatabase();
  const rows = await sql`
    SELECT cs.class_id, s.code
    FROM class_subjects cs
    JOIN school_subjects s ON s.id = cs.subject_id AND s.school_id = ${schoolId}
    WHERE cs.school_id = ${schoolId} AND cs.active = true AND s.active = true
    ORDER BY cs.class_id, s.code
  `;
  const byClass = new Map<string, string[]>();
  for (const row of rows) {
    const classId = String(row.class_id);
    const list = byClass.get(classId) ?? [];
    list.push(String(row.code));
    byClass.set(classId, list);
  }
  return byClass;
}

/**
 * Hydrate each student's subject list with the class's expected subjects that
 * have no stored result yet (added as "missing"), then recompute the
 * missing/absent subject lists using the same exclusive-choice-aware policy as
 * the Google Sheets parser. This keeps readiness, the completion heatmap and
 * the year/class analyses from treating unentered subjects as nonexistent.
 */
export function hydrateExpectedSubjects(
  students: UpsaStudentResult[],
  expectedCodes: string[],
  schoolSubjects: SchoolSubjectRecord[],
): void {
  for (const student of students) {
    if (expectedCodes.length > 0) {
      const present = new Set(student.subjects.map((subject) => subject.subjectCode));
      for (const code of expectedCodes) {
        if (present.has(code)) continue;
        student.subjects.push({
          subjectCode: code,
          subjectName: subjectDisplayName(code, schoolSubjects),
          mark: null,
          maxMark: 100,
          grade: null,
          status: "missing",
        });
      }
    }
    student.missingSubjects = getMissingUpsaSubjectCodes(student.subjects);
    student.absentSubjects = getAbsentUpsaSubjectCodes(student.subjects);
  }
}

/**
 * Upsert assessment results for matched students in a class result.
 * Only writes rows for students with matchStatus === "matched" and a valid enrollmentId.
 * Returns the number of rows upserted and skipped.
 */
export async function upsertAssessmentResults(
  context: ActorContext,
  period: AssessmentPeriod,
  classResult: UpsaClassResult,
  classId: string,
  academicYearId: string,
): Promise<{ upserted: number; skipped: number }> {
  if (!isDatabaseConfigured()) return { upserted: 0, skipped: 0 };
  const sql = getDatabase();
  const schoolId = context.school.id;
  const assessmentType = period.assessment;

  const matched = classResult.students.filter(
    (s) => s.matchStatus === "matched" && s.enrollmentId && s.studentId,
  );
  if (matched.length === 0) return { upserted: 0, skipped: classResult.students.length };

  const operations = [];
  let upserted = 0;

  for (const student of matched) {
    for (const subject of student.subjects) {
      const id = randomUUID();
      operations.push(sql`
        INSERT INTO assessment_results (
          id, school_id, academic_year_id, assessment_type, class_id,
          enrollment_id, student_id, subject_code, mark, max_mark, grade, status, source_sheet
        ) VALUES (
          ${id}, ${schoolId}, ${academicYearId}, ${assessmentType}, ${classId},
          ${student.enrollmentId}, ${student.studentId}, ${subject.subjectCode},
          ${subject.mark}, ${subject.maxMark}, ${subject.grade}, ${subject.status},
          ${classResult.className}
        )
        ON CONFLICT (school_id, academic_year_id, assessment_type, enrollment_id, subject_code)
        DO UPDATE SET
          mark = EXCLUDED.mark,
          max_mark = EXCLUDED.max_mark,
          grade = EXCLUDED.grade,
          status = EXCLUDED.status,
          source_sheet = EXCLUDED.source_sheet,
          updated_at = now()
        WHERE assessment_results.mark IS DISTINCT FROM EXCLUDED.mark
          OR assessment_results.grade IS DISTINCT FROM EXCLUDED.grade
          OR assessment_results.status IS DISTINCT FROM EXCLUDED.status
      `);
      upserted += 1;
    }
  }

  if (operations.length) await sql.transaction(operations);
  return { upserted, skipped: classResult.students.length - matched.length };
}

/**
 * Fetch all assessment results for a specific class.
 */
export async function getAssessmentResultsForClass(
  context: ActorContext,
  period: AssessmentPeriod,
  classId: string,
  academicYearId: string,
): Promise<AssessmentResultRow[]> {
  if (!isDatabaseConfigured()) return [];
  const sql = getDatabase();
  const rows = await sql`
    SELECT * FROM assessment_results
    WHERE school_id = ${context.school.id}
      AND academic_year_id = ${academicYearId}
      AND assessment_type = ${period.assessment}
      AND class_id = ${classId}
    ORDER BY enrollment_id, subject_code
  `;
  return rows.map((row) => rowFromDb(row as Record<string, unknown>));
}

/**
 * Fetch all assessment results for a period, grouped by class ID.
 */
export async function getAllAssessmentResultsForPeriod(
  context: ActorContext,
  period: AssessmentPeriod,
  academicYearId: string,
): Promise<Map<string, AssessmentResultRow[]>> {
  if (!isDatabaseConfigured()) return new Map();
  const sql = getDatabase();
  const rows = await sql`
    SELECT * FROM assessment_results
    WHERE school_id = ${context.school.id}
      AND academic_year_id = ${academicYearId}
      AND assessment_type = ${period.assessment}
    ORDER BY class_id, enrollment_id, subject_code
  `;
  const byClass = new Map<string, AssessmentResultRow[]>();
  for (const row of rows) {
    const classId = String(row.class_id);
    const list = byClass.get(classId) ?? [];
    list.push(rowFromDb(row as Record<string, unknown>));
    byClass.set(classId, list);
  }
  return byClass;
}

/**
 * Reconstruct an UpsaClassResult from assessment_results rows joined with
 * the student registry. Returns null if no results exist for the class.
 */
export async function buildClassResultFromDb(
  context: ActorContext,
  period: AssessmentPeriod,
  className: string,
  academicYearId: string,
  registry: SchoolRegistry,
): Promise<UpsaClassResult | null> {
  if (!isDatabaseConfigured()) return null;
  const sql = getDatabase();
  const schoolId = context.school.id;

  // Find the class ID from the registry
  const classEnrollment = registry.enrollments.find(
    (e) => e.className === className && e.active,
  );
  if (!classEnrollment) return null;
  const classId = classEnrollment.classId;

  const teacherRows = await sql`SELECT teacher_name FROM school_classes WHERE id = ${classId} AND school_id = ${schoolId} LIMIT 1`;
  const teacherName = teacherRows[0]?.teacher_name ? String(teacherRows[0].teacher_name) : "";

  const rows = await sql`
    SELECT ar.*, ss.display_name, ss.normalized_name, sce.roster_number
    FROM assessment_results ar
    JOIN student_class_enrolments sce ON sce.id = ar.enrollment_id AND sce.school_id = ${schoolId}
    JOIN school_students ss ON ss.id = ar.student_id AND ss.school_id = ${schoolId}
    WHERE ar.school_id = ${schoolId}
      AND ar.academic_year_id = ${academicYearId}
      AND ar.assessment_type = ${period.assessment}
      AND ar.class_id = ${classId}
    ORDER BY sce.roster_number NULLS LAST, ss.display_name, ar.subject_code
  `;
  if (rows.length === 0) return null;

  const schoolSubjects = await loadSchoolSubjects(schoolId);

  // Group by enrollment_id to reconstruct students
  const studentMap = new Map<string, {
    enrollmentId: string;
    studentId: string;
    name: string;
    rosterNumber: number | null;
    subjects: Array<{ subjectCode: string; mark: number | null; maxMark: number; grade: string | null; status: "marked" | "missing" | "absent" }>;
  }>();

  for (const row of rows) {
    const enrollmentId = String(row.enrollment_id);
    let entry = studentMap.get(enrollmentId);
    if (!entry) {
      entry = {
        enrollmentId,
        studentId: String(row.student_id),
        name: String(row.display_name),
        rosterNumber: row.roster_number === null || row.roster_number === undefined ? null : Number(row.roster_number),
        subjects: [],
      };
      studentMap.set(enrollmentId, entry);
    }
    entry.subjects.push({
      subjectCode: String(row.subject_code),
      mark: row.mark === null || row.mark === undefined ? null : Number(row.mark),
      maxMark: Number(row.max_mark),
      grade: row.grade === null || row.grade === undefined ? null : String(row.grade),
      status: String(row.status) as "marked" | "missing" | "absent",
    });
  }

  const students: UpsaStudentResult[] = [];
  let idx = 0;
  for (const [, entry] of studentMap) {
    idx += 1;
    const validSubjects = entry.subjects.filter((s) => s.mark !== null);
    const totalMarks = validSubjects.reduce((sum, s) => sum + (s.mark ?? 0), 0);
    const average = validSubjects.length ? totalMarks / validSubjects.length : null;

    const subjectResults: UpsaSubjectResult[] = entry.subjects.map((s) => ({
      subjectCode: s.subjectCode,
      subjectName: subjectDisplayName(s.subjectCode, schoolSubjects),
      mark: s.mark,
      maxMark: s.maxMark,
      grade: s.grade,
      status: s.status,
    }));

    students.push({
      id: `${className}-${idx}`,
      bil: entry.rosterNumber !== null ? String(entry.rosterNumber) : String(idx),
      name: entry.name,
      className,
      teacherName,
      subjects: subjectResults,
      average,
      totalMarks: validSubjects.length ? totalMarks : null,
      validSubjectCount: validSubjects.length,
      missingSubjects: [],
      absentSubjects: [],
      studentId: entry.studentId,
      enrollmentId: entry.enrollmentId,
      matchStatus: "matched",
    });
  }

  const expectedByClass = await loadExpectedSubjectCodesByClass(schoolId);
  hydrateExpectedSubjects(students, expectedByClass.get(classId) ?? [], schoolSubjects);

  return { className, teacherName, students };
}

/**
 * Reconstruct multiple UpsaClassResults from all assessment_results in a period.
 * Returns an array of class results for all classes that have stored results.
 */
export async function buildAllClassResultsFromDb(
  context: ActorContext,
  period: AssessmentPeriod,
  academicYearId: string,
  registry: SchoolRegistry,
): Promise<UpsaClassResult[]> {
  const byClass = await getAllAssessmentResultsForPeriod(context, period, academicYearId);
  if (byClass.size === 0) return [];

  const sql = getDatabase();
  const schoolSubjects = await loadSchoolSubjects(context.school.id);

  // Build a class ID → teacher name lookup from school_classes
  const teacherRaw = await sql`SELECT id, teacher_name FROM school_classes WHERE school_id = ${context.school.id} AND academic_year_id = ${academicYearId}`;
  const teacherNameByClass = new Map<string, string>();
  for (const row of teacherRaw) {
    teacherNameByClass.set(String(row.id), row.teacher_name ? String(row.teacher_name) : "");
  }

  // Build a class ID → class name lookup from registry
  const classNameById = new Map<string, string>();
  for (const enrollment of registry.enrollments) {
    if (enrollment.active && !classNameById.has(enrollment.classId)) {
      classNameById.set(enrollment.classId, enrollment.className);
    }
  }

  const results: UpsaClassResult[] = [];
  const expectedByClass = await loadExpectedSubjectCodesByClass(context.school.id);
  for (const [classId, rows] of byClass) {
    const className = classNameById.get(classId);
    if (!className || rows.length === 0) continue;
    const teacherName = teacherNameByClass.get(classId) ?? "";

    // Group by enrollment
    const studentMap = new Map<string, {
      enrollmentId: string;
      studentId: string;
      name: string;
      subjects: Array<{ subjectCode: string; mark: number | null; maxMark: number; grade: string | null; status: "marked" | "missing" | "absent" }>;
    }>();

    // Build a student name lookup from registry
    const studentNameById = new Map<string, string>();
    for (const student of registry.students) {
      studentNameById.set(student.id, student.displayName);
    }

    for (const row of rows) {
      const enrollmentId = row.enrollmentId;
      let entry = studentMap.get(enrollmentId);
      if (!entry) {
        entry = {
          enrollmentId,
          studentId: row.studentId,
          name: studentNameById.get(row.studentId) ?? "Unknown",
          subjects: [],
        };
        studentMap.set(enrollmentId, entry);
      }
      entry.subjects.push({
        subjectCode: row.subjectCode,
        mark: row.mark,
        maxMark: row.maxMark,
        grade: row.grade,
        status: row.status,
      });
    }

    const students: UpsaStudentResult[] = [];
    let idx = 0;
    for (const [, entry] of studentMap) {
      idx += 1;
      const validSubjects = entry.subjects.filter((s) => s.mark !== null);
      const totalMarks = validSubjects.reduce((sum, s) => sum + (s.mark ?? 0), 0);
      const average = validSubjects.length ? totalMarks / validSubjects.length : null;

      const subjectResults: UpsaSubjectResult[] = entry.subjects.map((s) => ({
        subjectCode: s.subjectCode,
        subjectName: subjectDisplayName(s.subjectCode, schoolSubjects),
        mark: s.mark,
        maxMark: s.maxMark,
        grade: s.grade,
        status: s.status,
      }));

      students.push({
        id: `${className}-${idx}`,
        bil: String(idx),
        name: entry.name,
        className,
        teacherName,
        subjects: subjectResults,
        average,
        totalMarks: validSubjects.length ? totalMarks : null,
        validSubjectCount: validSubjects.length,
        missingSubjects: subjectResults.filter((s) => s.status === "missing").map((s) => s.subjectCode),
        absentSubjects: subjectResults.filter((s) => s.status === "absent").map((s) => s.subjectCode),
        studentId: entry.studentId,
        enrollmentId: entry.enrollmentId,
        matchStatus: "matched",
      });
    }

    hydrateExpectedSubjects(students, expectedByClass.get(classId) ?? [], schoolSubjects);

    results.push({ className, teacherName, students });
  }

  return results;
}
