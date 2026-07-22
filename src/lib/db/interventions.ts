import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ActorContext } from "@/lib/auth/actor";
import { getDatabase, isDatabaseConfigured } from "@/lib/db/client";
import { getDatabasePbdSetup } from "@/lib/db/pbd";
import { validateCompletion } from "@/lib/pbd/interventionLifecycle";
import type { PbdInterventionEntry } from "@/types/intervention";

const saveSchema = z.object({
  year: z.string().regex(/^\d{4}$/),
  semester: z.enum(["1", "2"]),
  classSubjectId: z.string().uuid(),
  classEnrollmentId: z.string().uuid(),
  expectedRevision: z.coerce.number().int().min(0),
  tpLevel: z.coerce.number().int().min(1).max(2),
  problem: z.string().trim().min(1, "Masalah diperlukan.").max(2000),
  intervention: z.string().trim().min(1, "Intervensi diperlukan.").max(2000),
  workflowStatus: z.enum(["planned", "in_progress", "needs_review", "completed"]).default("planned"),
  reviewDueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  followUpNote: z.string().trim().max(2000).nullable().optional(),
  reviewedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});
const archiveSchema = z.object({
  interventionId: z.string().uuid(),
  expectedRevision: z.coerce.number().int().positive(),
  restore: z.boolean(),
});

function requireDatabase() {
  if (!isDatabaseConfigured()) throw new Error("Pangkalan data belum dikonfigurasi.");
  return getDatabase();
}

export async function getDatabasePbdInterventions(
  context: ActorContext,
  year: string,
  semester: "1" | "2",
): Promise<PbdInterventionEntry[]> {
  if (!isDatabaseConfigured()) return [];
  const setup = await getDatabasePbdSetup(context, year, semester);
  if (!setup.periodId) return [];
  const sql = getDatabase();
  const schoolId = context.school.id;
  const rows = await sql`
    SELECT item.id, item.revision, item.active, item.tp_level, item.problem, item.intervention,
      item.student_id, item.class_enrolment_id, item.class_subject_id,
      item.workflow_status, item.review_due_on, item.follow_up_note, item.reviewed_on,
      st.display_name AS student_name, st.normalized_name,
      c.id AS class_id, c.name AS class_name, c.level_number,
      s.id AS subject_id, s.code AS subject_code, s.name AS subject_name
    FROM pbd_student_interventions item
    JOIN student_class_enrolments enrollment ON enrollment.id = item.class_enrolment_id AND enrollment.school_id = ${schoolId} AND enrollment.active = true
    JOIN school_students st ON st.id = item.student_id AND st.school_id = ${schoolId} AND st.active = true
    JOIN class_subjects cs ON cs.id = item.class_subject_id AND cs.school_id = ${schoolId} AND cs.active = true
    JOIN school_classes c ON c.id = cs.class_id AND c.id = enrollment.class_id AND c.school_id = ${schoolId} AND c.active = true
    JOIN school_subjects s ON s.id = cs.subject_id AND s.school_id = ${schoolId} AND s.active = true
    WHERE item.school_id = ${schoolId} AND item.period_id = ${setup.periodId}
    ORDER BY c.level_kind, c.level_number, c.name, s.code, st.display_name
  `;
  return rows.map((row) => ({
    id: String(row.id), studentId: String(row.student_id), classEnrollmentId: String(row.class_enrolment_id),
    classId: String(row.class_id), subjectId: String(row.subject_id), classSubjectId: String(row.class_subject_id),
    subjectCode: String(row.subject_code), subjectName: String(row.subject_name),
    studentName: String(row.student_name), normalizedStudentName: String(row.normalized_name),
    className: String(row.class_name), normalizedClassName: String(row.class_name).trim().replace(/\s+/g, " ").toLocaleUpperCase("ms"),
    year: row.level_number === null ? Number(String(row.class_name).match(/\d+/)?.[0] ?? 0) : Number(row.level_number),
    tp: Number(row.tp_level) as 1 | 2, problem: String(row.problem), intervention: String(row.intervention),
    semester, revision: Number(row.revision), active: Boolean(row.active),
    workflowStatus: (row.workflow_status ?? "planned") as PbdInterventionEntry["workflowStatus"],
    reviewDueOn: row.review_due_on ? String(row.review_due_on) : null,
    followUpNote: row.follow_up_note ? String(row.follow_up_note) : null,
    reviewedOn: row.reviewed_on ? String(row.reviewed_on) : null,
  }));
}

export async function saveDatabasePbdIntervention(context: ActorContext, raw: unknown) {
  const input = saveSchema.parse(raw);
  const completionError = validateCompletion({
    workflowStatus: input.workflowStatus,
    followUpNote: input.followUpNote ?? null,
    reviewDueOn: input.reviewDueOn ?? null,
  });
  if (completionError) throw new Error(completionError);
  const setup = await getDatabasePbdSetup(context, input.year, input.semester);
  if (!setup.periodId) throw new Error("Tempoh PBD tidak ditemui.");
  const sql = requireDatabase();
  const rows = await sql`
    SELECT * FROM save_pbd_student_intervention(
      ${randomUUID()}, ${randomUUID()}, ${context.school.id}, ${context.actor.id}, ${setup.periodId},
      ${input.classSubjectId}, ${input.classEnrollmentId}, ${input.expectedRevision}, ${input.tpLevel},
      ${input.problem}, ${input.intervention}, ${input.workflowStatus},
      ${input.reviewDueOn ?? null}, ${input.followUpNote || null}, ${input.reviewedOn ?? null}
    )
  `;
  return { id: String(rows[0]?.id), revision: Number(rows[0]?.revision), changed: Boolean(rows[0]?.changed) };
}

export async function setDatabasePbdInterventionArchived(context: ActorContext, raw: unknown) {
  const input = archiveSchema.parse(raw);
  const sql = requireDatabase();
  const rows = await sql`
    SELECT * FROM set_pbd_student_intervention_active(
      ${randomUUID()}, ${context.school.id}, ${context.actor.id}, ${input.interventionId},
      ${input.expectedRevision}, ${input.restore}
    )
  `;
  return { id: String(rows[0]?.id), revision: Number(rows[0]?.revision), changed: Boolean(rows[0]?.changed) };
}
