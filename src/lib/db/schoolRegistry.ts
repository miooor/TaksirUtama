import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ActorContext } from "@/lib/auth/actor";
import { getDatabase, isDatabaseConfigured } from "@/lib/db/client";
import { buildRosterImportPreview, normalizePupilName } from "@/lib/school/rosterImport";
import type { RosterImportRow, SchoolRegistry, SchoolStudent, StudentClassEnrollment } from "@/types/registry";

const yearSchema = z.string().regex(/^\d{4}$/);
const importRowSchema = z.object({
  rowNumber: z.coerce.number().int().positive(),
  pupilCode: z.string().trim().max(40).nullable(),
  displayName: z.string().trim().min(1).max(160),
  className: z.string().trim().min(1).max(80),
  rosterNumber: z.coerce.number().int().positive().nullable(),
});
const editSchema = z.object({
  enrollmentId: z.string().uuid(),
  displayName: z.string().trim().min(1).max(160),
  pupilCode: z.preprocess((value) => String(value ?? "").trim() || null, z.string().max(40).nullable()),
  rosterNumber: z.preprocess((value) => String(value ?? "").trim() || null, z.coerce.number().int().positive().nullable()),
});
const archiveSchema = z.object({ enrollmentId: z.string().uuid(), restore: z.boolean() });

function requireDatabase() {
  if (!isDatabaseConfigured()) throw new Error("Pangkalan data belum dikonfigurasi.");
  return getDatabase();
}

function studentFromRow(row: Record<string, unknown>): SchoolStudent {
  return {
    id: String(row.id),
    pupilCode: row.pupil_code ? String(row.pupil_code) : null,
    displayName: String(row.display_name),
    normalizedName: String(row.normalized_name),
    active: Boolean(row.active),
  };
}

export async function getSchoolRegistry(context: ActorContext, year: string): Promise<SchoolRegistry> {
  const selectedYear = yearSchema.parse(year);
  if (!isDatabaseConfigured()) return { schoolId: context.school.id, year: selectedYear, academicYearId: null, students: [], enrollments: [] };
  const sql = getDatabase();
  const schoolId = context.school.id;
  const years = await sql`SELECT id FROM academic_years WHERE school_id = ${schoolId} AND year = ${selectedYear} LIMIT 1`;
  const academicYearId = years[0]?.id ? String(years[0].id) : null;
  const studentsRaw = await sql`SELECT id, pupil_code, display_name, normalized_name, active FROM school_students WHERE school_id = ${schoolId} ORDER BY display_name`;
  const students = studentsRaw.map((row) => studentFromRow(row as Record<string, unknown>));
  const studentById = new Map(students.map((student) => [student.id, student]));
  const enrollmentsRaw = academicYearId ? await sql`
    SELECT e.id, e.student_id, e.class_id, e.academic_year_id, e.roster_number, e.active, c.name AS class_name
    FROM student_class_enrolments e
    JOIN school_classes c ON c.id = e.class_id AND c.school_id = ${schoolId}
    WHERE e.school_id = ${schoolId} AND e.academic_year_id = ${academicYearId}
    ORDER BY c.level_kind, c.level_number, c.name, e.roster_number NULLS LAST, e.id
  ` : [];
  const enrollments = enrollmentsRaw.flatMap<StudentClassEnrollment>((row) => {
    const student = studentById.get(String(row.student_id));
    return student ? [{
      id: String(row.id), studentId: student.id, classId: String(row.class_id), className: String(row.class_name),
      academicYearId: String(row.academic_year_id), rosterNumber: row.roster_number === null ? null : Number(row.roster_number),
      active: Boolean(row.active), student,
    }] : [];
  });
  return { schoolId, year: selectedYear, academicYearId, students, enrollments };
}

export async function importSchoolRoster(
  context: ActorContext,
  year: string,
  rawRows: RosterImportRow[],
) {
  const selectedYear = yearSchema.parse(year);
  const rows = z.array(importRowSchema).min(1).max(3000).parse(rawRows);
  const sql = requireDatabase();
  const schoolId = context.school.id;
  const yearRows = await sql`SELECT id FROM academic_years WHERE school_id = ${schoolId} AND year = ${selectedYear} LIMIT 1`;
  const academicYearId = yearRows[0]?.id ? String(yearRows[0].id) : null;
  if (!academicYearId) throw new Error("Tambah sekurang-kurangnya satu kelas bagi tahun ini sebelum mengimport murid.");
  const classesRaw = await sql`SELECT id, name, active FROM school_classes WHERE school_id = ${schoolId} AND academic_year_id = ${academicYearId}`;
  const classes = classesRaw.map((row) => ({ id: String(row.id), name: String(row.name), active: Boolean(row.active) }));
  const registry = await getSchoolRegistry(context, selectedYear);
  const preview = buildRosterImportPreview(rows, classes, registry);
  if (preview.errorCount) throw new Error("Import mempunyai ralat. Semak pratonton sebelum mengesahkan.");

  const operations = [];
  let created = 0;
  let matched = 0;
  for (const row of preview.rows) {
    if (row.status === "match") { matched += 1; continue; }
    const studentId = row.studentId ?? randomUUID();
    const enrollmentId = randomUUID();
    const roster = row.status === "warning" ? null : row.rosterNumber;
    if (!row.studentId) operations.push(sql`INSERT INTO school_students (id, school_id, pupil_code, display_name, normalized_name)
        VALUES (${studentId}, ${schoolId}, ${row.pupilCode}, ${row.displayName}, ${normalizePupilName(row.displayName)})`);
    operations.push(
      sql`INSERT INTO student_class_enrolments (id, school_id, student_id, academic_year_id, class_id, roster_number)
        VALUES (${enrollmentId}, ${schoolId}, ${studentId}, ${academicYearId}, ${row.classId}, ${roster})`,
      sql`INSERT INTO audit_events (id, school_id, actor_id, actor_role, action, resource_type, resource_id, outcome, metadata_json)
        VALUES (${randomUUID()}, ${schoolId}, ${context.actor.id}, ${context.actor.role}, 'student.create', 'school_student', ${studentId}, 'success',
          ${JSON.stringify({ year: selectedYear, classId: row.classId, enrollmentId })}::jsonb)`,
    );
    created += 1;
  }
  if (operations.length) await sql.transaction(operations);
  return { created, matched, warningCount: preview.warningCount };
}

export async function updateSchoolRosterStudent(context: ActorContext, raw: unknown) {
  const input = editSchema.parse(raw);
  const sql = requireDatabase();
  const schoolId = context.school.id;
  const rows = await sql`
    SELECT e.id, e.student_id FROM student_class_enrolments e
    JOIN school_students s ON s.id = e.student_id AND s.school_id = ${schoolId}
    WHERE e.id = ${input.enrollmentId} AND e.school_id = ${schoolId} LIMIT 1
  `;
  if (!rows[0]) throw new Error("Murid tidak ditemui.");
  const studentId = String(rows[0].student_id);
  await sql.transaction((txn) => [
    txn`UPDATE school_students SET pupil_code = ${input.pupilCode}, display_name = ${input.displayName},
      normalized_name = ${normalizePupilName(input.displayName)}, updated_at = now()
      WHERE id = ${studentId} AND school_id = ${schoolId}`,
    txn`UPDATE student_class_enrolments SET roster_number = ${input.rosterNumber}, updated_at = now()
      WHERE id = ${input.enrollmentId} AND school_id = ${schoolId}`,
    txn`INSERT INTO audit_events (id, school_id, actor_id, actor_role, action, resource_type, resource_id, outcome, metadata_json)
      VALUES (${randomUUID()}, ${schoolId}, ${context.actor.id}, ${context.actor.role}, 'student.update', 'school_student', ${studentId}, 'success',
        ${JSON.stringify({ enrollmentId: input.enrollmentId })}::jsonb)`,
  ]);
}

export async function setSchoolRosterStudentArchived(context: ActorContext, raw: unknown) {
  const input = archiveSchema.parse(raw);
  const sql = requireDatabase();
  const schoolId = context.school.id;
  const active = input.restore;
  const rows = await sql`
    SELECT e.id, e.student_id, c.active AS class_active FROM student_class_enrolments e
    JOIN school_classes c ON c.id = e.class_id AND c.school_id = ${schoolId}
    WHERE e.id = ${input.enrollmentId} AND e.school_id = ${schoolId} LIMIT 1
  `;
  if (!rows[0]) throw new Error("Murid tidak ditemui.");
  if (active && !rows[0].class_active) throw new Error("Pulihkan kelas sebelum memulihkan murid.");
  const studentId = String(rows[0].student_id);
  await sql.transaction((txn) => [
    txn`UPDATE student_class_enrolments SET active = ${active}, updated_at = now() WHERE id = ${input.enrollmentId} AND school_id = ${schoolId}`,
    txn`UPDATE school_students
      SET active = CASE WHEN ${active} THEN true ELSE active END,
          updated_at = CASE WHEN ${active} THEN now() ELSE updated_at END
      WHERE id = ${studentId} AND school_id = ${schoolId}`,
    txn`INSERT INTO audit_events (id, school_id, actor_id, actor_role, action, resource_type, resource_id, outcome, metadata_json)
      VALUES (${randomUUID()}, ${schoolId}, ${context.actor.id}, ${context.actor.role}, ${active ? "student.restore" : "student.archive"},
        'school_student', ${studentId}, 'success', ${JSON.stringify({ enrollmentId: input.enrollmentId })}::jsonb)`,
  ]);
}
