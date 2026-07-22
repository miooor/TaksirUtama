import { randomUUID } from "node:crypto";
import type { ActorContext } from "@/lib/auth/actor";
import { getDatabase, isDatabaseConfigured } from "@/lib/db/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StudentMark = {
  enrollmentId: string;
  studentId: string;
  mark: number | null;
  status: "marked" | "absent" | "missing";
};

export type AssessmentEntryStatus = {
  id: string;
  schoolId: string;
  academicYearId: string;
  assessmentType: string;
  classId: string;
  subjectId: string;
  enrolledCount: number;
  status: "draft" | "final";
  revision: number;
  updatedBy: string;
};

export type EntryGridStudent = {
  enrollmentId: string;
  studentId: string;
  displayName: string;
  rosterNumber: number | null;
  mark: number | null;
  maxMark: number;
  status: "marked" | "absent" | "missing";
};

export type EntryGridData = {
  students: EntryGridStudent[];
  status: AssessmentEntryStatus | null;
  className: string;
  subjectCode: string;
  subjectName: string;
  levelKind: string;
  levelNumber: number | null;
};

export type EntryProgressRow = {
  classId: string;
  className: string;
  levelKind: string;
  levelNumber: number | null;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  status: "draft" | "final" | "empty";
  enrolledCount: number;
  markedCount: number;
  revision: number;
};

export type SaveMarksInput = {
  year: string;
  assessmentType: "upsa" | "uasa";
  classId: string;
  subjectId: string;
  expectedRevision: number;
  marks: StudentMark[];
};

export type SaveMarksResult = {
  revision: number;
  status: "draft" | "final";
  changedCount: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireDb() {
  if (!isDatabaseConfigured()) throw new Error("Pangkalan data belum dikonfigurasi.");
  return getDatabase();
}

async function resolveAcademicYearId(schoolId: string, year: string): Promise<string> {
  const sql = getDatabase();
  const rows = await sql`SELECT id FROM academic_years WHERE school_id = ${schoolId} AND year = ${year} LIMIT 1`;
  if (!rows[0]) throw new Error("Tahun akademik tidak ditemui. Sediakan kelas terlebih dahulu.");
  return String(rows[0].id);
}

function statusFromRow(row: Record<string, unknown>): AssessmentEntryStatus {
  return {
    id: String(row.id),
    schoolId: String(row.school_id),
    academicYearId: String(row.academic_year_id),
    assessmentType: String(row.assessment_type),
    classId: String(row.class_id),
    subjectId: String(row.subject_id),
    enrolledCount: Number(row.enrolled_count),
    status: String(row.status) as "draft" | "final",
    revision: Number(row.revision),
    updatedBy: String(row.updated_by),
  };
}

// ---------------------------------------------------------------------------
// Entry Grid
// ---------------------------------------------------------------------------

/**
 * Load the entry grid for a specific class + subject + period.
 * Returns enrolled students with their current marks and the entry status.
 */
export async function getAssessmentEntryGrid(
  context: ActorContext,
  year: string,
  assessmentType: "upsa" | "uasa",
  classId: string,
  subjectId: string,
): Promise<EntryGridData> {
  const sql = requireDb();
  const schoolId = context.school.id;
  const academicYearId = await resolveAcademicYearId(schoolId, year);

  // Load class info
  const classRows = await sql`
    SELECT c.name, c.level_kind, c.level_number, s.code AS subject_code, s.name AS subject_name
    FROM school_classes c, school_subjects s
    WHERE c.id = ${classId} AND c.school_id = ${schoolId}
      AND s.id = ${subjectId} AND s.school_id = ${schoolId}
    LIMIT 1
  `;
  if (!classRows[0]) throw new Error("Kelas atau subjek tidak ditemui.");

  // Load enrolled students with their marks
  const studentsRaw = await sql`
    SELECT
      e.id AS enrollment_id,
      e.student_id,
      st.display_name,
      e.roster_number,
      r.mark,
      r.max_mark,
      r.status AS result_status
    FROM student_class_enrolments e
    JOIN school_students st ON st.id = e.student_id AND st.school_id = ${schoolId}
    LEFT JOIN assessment_results r
      ON r.enrollment_id = e.id
      AND r.school_id = ${schoolId}
      AND r.academic_year_id = ${academicYearId}
      AND r.assessment_type = ${assessmentType}
      AND r.subject_code = (SELECT code FROM school_subjects WHERE id = ${subjectId} AND school_id = ${schoolId})
    WHERE e.school_id = ${schoolId} AND e.class_id = ${classId} AND e.academic_year_id = ${academicYearId} AND e.active = true
    ORDER BY e.roster_number NULLS LAST, st.display_name
  `;

  const students: EntryGridStudent[] = studentsRaw.map((row) => ({
    enrollmentId: String(row.enrollment_id),
    studentId: String(row.student_id),
    displayName: String(row.display_name),
    rosterNumber: row.roster_number === null ? null : Number(row.roster_number),
    mark: row.mark === null || row.mark === undefined ? null : Number(row.mark),
    maxMark: row.max_mark === null || row.max_mark === undefined ? 100 : Number(row.max_mark),
    status: row.result_status ? String(row.result_status) as EntryGridStudent["status"] : "missing",
  }));

  // Load entry status
  const statusRows = await sql`
    SELECT * FROM assessment_entry_status
    WHERE school_id = ${schoolId} AND academic_year_id = ${academicYearId}
      AND assessment_type = ${assessmentType} AND class_id = ${classId} AND subject_id = ${subjectId}
    LIMIT 1
  `;
  const status = statusRows[0] ? statusFromRow(statusRows[0] as Record<string, unknown>) : null;

  return {
    students,
    status,
    className: String(classRows[0].name),
    subjectCode: String(classRows[0].subject_code),
    subjectName: String(classRows[0].subject_name),
    levelKind: String(classRows[0].level_kind),
    levelNumber: classRows[0].level_number === null ? null : Number(classRows[0].level_number),
  };
}

// ---------------------------------------------------------------------------
// Save Marks
// ---------------------------------------------------------------------------

/**
 * Save marks for all students in a class+subject. Creates or updates the
 * entry status record with optimistic concurrency control.
 */
export async function saveAssessmentMarks(
  context: ActorContext,
  input: SaveMarksInput,
): Promise<SaveMarksResult> {
  const sql = requireDb();
  const schoolId = context.school.id;
  const actorId = context.actor.id;
  const academicYearId = await resolveAcademicYearId(schoolId, input.year);

  // Resolve subject code
  const subjectRows = await sql`SELECT code FROM school_subjects WHERE id = ${input.subjectId} AND school_id = ${schoolId} LIMIT 1`;
  if (!subjectRows[0]) throw new Error("Subjek tidak ditemui.");
  const subjectCode = String(subjectRows[0].code);

  // Get or validate entry status
  const statusRows = await sql`
    SELECT * FROM assessment_entry_status
    WHERE school_id = ${schoolId} AND academic_year_id = ${academicYearId}
      AND assessment_type = ${input.assessmentType} AND class_id = ${input.classId} AND subject_id = ${input.subjectId}
    FOR UPDATE
  `;

  const existing = statusRows[0] ? statusFromRow(statusRows[0] as Record<string, unknown>) : null;
  const currentRevision = existing?.revision ?? 0;

  if (currentRevision !== input.expectedRevision) {
    throw new Error("Rekod telah dikemas kini oleh pengguna lain. Muat semula halaman.");
  }
  if (existing?.status === "final") {
    throw new Error("Buka semula rekod muktamad sebelum mengubahnya.");
  }

  // Upsert marks
  const operations = [];
  let changedCount = 0;
  for (const entry of input.marks) {
    const id = randomUUID();
    operations.push(sql`
      INSERT INTO assessment_results (
        id, school_id, academic_year_id, assessment_type, class_id,
        enrollment_id, student_id, subject_code, mark, max_mark, status
      ) VALUES (
        ${id}, ${schoolId}, ${academicYearId}, ${input.assessmentType}, ${input.classId},
        ${entry.enrollmentId}, ${entry.studentId}, ${subjectCode},
        ${entry.mark}, 100, ${entry.status}
      )
      ON CONFLICT (school_id, academic_year_id, assessment_type, enrollment_id, subject_code)
      DO UPDATE SET
        mark = EXCLUDED.mark,
        status = EXCLUDED.status,
        updated_at = now()
      WHERE assessment_results.mark IS DISTINCT FROM EXCLUDED.mark
        OR assessment_results.status IS DISTINCT FROM EXCLUDED.status
    `);
    changedCount += 1;
  }

  // Upsert entry status
  const enrolledCount = input.marks.length;
  const statusId = existing?.id ?? randomUUID();
  if (existing) {
    operations.push(sql`
      UPDATE assessment_entry_status
      SET enrolled_count = ${enrolledCount}, revision = revision + 1, updated_by = ${actorId}, updated_at = now()
      WHERE id = ${existing.id}
    `);
  } else {
    operations.push(sql`
      INSERT INTO assessment_entry_status (id, school_id, academic_year_id, assessment_type, class_id, subject_id, enrolled_count, status, revision, updated_by)
      VALUES (${statusId}, ${schoolId}, ${academicYearId}, ${input.assessmentType}, ${input.classId}, ${input.subjectId}, ${enrolledCount}, 'draft', 1, ${actorId})
    `);
  }

  // Record revision
  const revisionId = randomUUID();
  operations.push(sql`
    INSERT INTO assessment_entry_revisions (id, school_id, entry_status_id, actor_id, action, summary_json)
    VALUES (${revisionId}, ${schoolId}, ${statusId}, ${actorId}, 'save_draft',
      ${JSON.stringify({ markedCount: input.marks.filter((m) => m.status === "marked").length, absentCount: input.marks.filter((m) => m.status === "absent").length })}::jsonb)
  `);

  await sql.transaction(operations);
  return { revision: currentRevision + 1, status: "draft", changedCount };
}

// ---------------------------------------------------------------------------
// Finalize
// ---------------------------------------------------------------------------

/**
 * Finalize an entry. Validates that all enrolled students have a mark or are absent.
 */
export async function finalizeAssessmentEntry(
  context: ActorContext,
  input: { year: string; assessmentType: "upsa" | "uasa"; classId: string; subjectId: string; expectedRevision: number },
): Promise<{ revision: number; status: "final" }> {
  const sql = requireDb();
  const schoolId = context.school.id;
  const actorId = context.actor.id;
  const academicYearId = await resolveAcademicYearId(schoolId, input.year);

  const statusRows = await sql`
    SELECT * FROM assessment_entry_status
    WHERE school_id = ${schoolId} AND academic_year_id = ${academicYearId}
      AND assessment_type = ${input.assessmentType} AND class_id = ${input.classId} AND subject_id = ${input.subjectId}
    FOR UPDATE
  `;
  const existing = statusRows[0] ? statusFromRow(statusRows[0] as Record<string, unknown>) : null;
  if (!existing) throw new Error("Tiada draf untuk dimuktamadkan. Simpan markah terlebih dahulu.");
  if (existing.revision !== input.expectedRevision) throw new Error("Rekod telah dikemas kini. Muat semula halaman.");
  if (existing.status === "final") throw new Error("Rekod telah pun dimuktamadkan.");

  // Validate completeness: check all active enrollments have a result
  const subjectRows = await sql`SELECT code FROM school_subjects WHERE id = ${input.subjectId} AND school_id = ${schoolId} LIMIT 1`;
  const subjectCode = String(subjectRows[0].code);

  const missingRows = await sql`
    SELECT e.id FROM student_class_enrolments e
    WHERE e.school_id = ${schoolId} AND e.class_id = ${input.classId} AND e.academic_year_id = ${academicYearId} AND e.active = true
      AND NOT EXISTS (
        SELECT 1 FROM assessment_results r
        WHERE r.enrollment_id = e.id AND r.school_id = ${schoolId}
          AND r.academic_year_id = ${academicYearId} AND r.assessment_type = ${input.assessmentType}
          AND r.subject_code = ${subjectCode} AND r.status IN ('marked', 'absent')
      )
  `;
  if (missingRows.length > 0) {
    throw new Error(`${missingRows.length} murid belum mempunyai markah atau status TH.`);
  }

  const operations = [
    sql`UPDATE assessment_entry_status SET status = 'final', revision = revision + 1, updated_by = ${actorId}, updated_at = now() WHERE id = ${existing.id}`,
    sql`INSERT INTO assessment_entry_revisions (id, school_id, entry_status_id, actor_id, action, summary_json)
      VALUES (${randomUUID()}, ${schoolId}, ${existing.id}, ${actorId}, 'finalize', ${JSON.stringify({ enrolledCount: existing.enrolledCount })}::jsonb)`,
  ];
  await sql.transaction(operations);
  return { revision: existing.revision + 1, status: "final" };
}

// ---------------------------------------------------------------------------
// Reopen
// ---------------------------------------------------------------------------

/**
 * Reopen a finalized entry for editing.
 */
export async function reopenAssessmentEntry(
  context: ActorContext,
  input: { year: string; assessmentType: "upsa" | "uasa"; classId: string; subjectId: string; expectedRevision: number },
): Promise<{ revision: number; status: "draft" }> {
  const sql = requireDb();
  const schoolId = context.school.id;
  const actorId = context.actor.id;
  const academicYearId = await resolveAcademicYearId(schoolId, input.year);

  const statusRows = await sql`
    SELECT * FROM assessment_entry_status
    WHERE school_id = ${schoolId} AND academic_year_id = ${academicYearId}
      AND assessment_type = ${input.assessmentType} AND class_id = ${input.classId} AND subject_id = ${input.subjectId}
    FOR UPDATE
  `;
  const existing = statusRows[0] ? statusFromRow(statusRows[0] as Record<string, unknown>) : null;
  if (!existing) throw new Error("Tiada rekod untuk dibuka semula.");
  if (existing.revision !== input.expectedRevision) throw new Error("Rekod telah dikemas kini. Muat semula halaman.");
  if (existing.status !== "final") throw new Error("Rekod ini belum dimuktamadkan.");

  const operations = [
    sql`UPDATE assessment_entry_status SET status = 'draft', revision = revision + 1, updated_by = ${actorId}, updated_at = now() WHERE id = ${existing.id}`,
    sql`INSERT INTO assessment_entry_revisions (id, school_id, entry_status_id, actor_id, action, summary_json)
      VALUES (${randomUUID()}, ${schoolId}, ${existing.id}, ${actorId}, 'reopen', '{}'::jsonb)`,
  ];
  await sql.transaction(operations);
  return { revision: existing.revision + 1, status: "draft" };
}

// ---------------------------------------------------------------------------
// Progress Overview
// ---------------------------------------------------------------------------

/**
 * Load entry progress for all class+subject combinations in a period.
 */
export async function getAssessmentEntryProgress(
  context: ActorContext,
  year: string,
  assessmentType: "upsa" | "uasa",
): Promise<EntryProgressRow[]> {
  const sql = requireDb();
  const schoolId = context.school.id;
  const academicYearId = await resolveAcademicYearId(schoolId, year);

  const rows = await sql`
    SELECT
      cs.class_id,
      c.name AS class_name,
      c.level_kind,
      c.level_number,
      cs.subject_id,
      s.code AS subject_code,
      s.name AS subject_name,
      COALESCE(aes.status, 'empty') AS status,
      COALESCE(aes.enrolled_count, c.enrolled_count) AS enrolled_count,
      aes.revision,
      (
        SELECT count(*)::integer FROM assessment_results r
        WHERE r.school_id = ${schoolId} AND r.academic_year_id = ${academicYearId}
          AND r.assessment_type = ${assessmentType} AND r.class_id = cs.class_id
          AND r.subject_code = s.code AND r.status IN ('marked', 'absent')
      ) AS marked_count
    FROM class_subjects cs
    JOIN school_classes c ON c.id = cs.class_id AND c.school_id = ${schoolId} AND c.active = true AND c.academic_year_id = ${academicYearId}
    JOIN school_subjects s ON s.id = cs.subject_id AND s.school_id = ${schoolId} AND s.active = true
    LEFT JOIN assessment_entry_status aes
      ON aes.school_id = ${schoolId} AND aes.academic_year_id = ${academicYearId}
      AND aes.assessment_type = ${assessmentType} AND aes.class_id = cs.class_id AND aes.subject_id = cs.subject_id
    WHERE cs.school_id = ${schoolId} AND cs.active = true
    ORDER BY c.level_kind, c.level_number, c.name, s.code
  `;

  return rows.map((row) => ({
    classId: String(row.class_id),
    className: String(row.class_name),
    levelKind: String(row.level_kind),
    levelNumber: row.level_number === null ? null : Number(row.level_number),
    subjectId: String(row.subject_id),
    subjectCode: String(row.subject_code),
    subjectName: String(row.subject_name),
    status: String(row.status) as EntryProgressRow["status"],
    enrolledCount: Number(row.enrolled_count),
    markedCount: Number(row.marked_count),
    revision: row.revision === null || row.revision === undefined ? 0 : Number(row.revision),
  }));
}

// ---------------------------------------------------------------------------
// Classes for Entry (fallback when no class_subjects exist)
// ---------------------------------------------------------------------------

export type ClassForEntry = {
  classId: string;
  className: string;
  levelKind: string;
  levelNumber: number | null;
  enrolledCount: number;
  hasSubjects: boolean;
};

/**
 * Load active classes for a school year, regardless of whether subjects
 * have been assigned. Used as a fallback when getAssessmentEntryProgress
 * returns empty (no class_subjects configured yet).
 */
export async function getClassesForEntry(
  context: ActorContext,
  year: string,
): Promise<ClassForEntry[]> {
  const sql = requireDb();
  const schoolId = context.school.id;
  const academicYearId = await resolveAcademicYearId(schoolId, year);

  const rows = await sql`
    SELECT c.id, c.name, c.level_kind, c.level_number, c.enrolled_count,
      EXISTS (SELECT 1 FROM class_subjects cs WHERE cs.class_id = c.id AND cs.school_id = ${schoolId} AND cs.active = true) AS has_subjects
    FROM school_classes c
    WHERE c.school_id = ${schoolId} AND c.academic_year_id = ${academicYearId} AND c.active = true
    ORDER BY c.level_kind, c.level_number, c.name
  `;

  return rows.map((row) => ({
    classId: String(row.id),
    className: String(row.name),
    levelKind: String(row.level_kind),
    levelNumber: row.level_number === null ? null : Number(row.level_number),
    enrolledCount: Number(row.enrolled_count),
    hasSubjects: Boolean(row.has_subjects),
  }));
}
