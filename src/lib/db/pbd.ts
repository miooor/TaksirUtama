import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDatabase, isDatabaseConfigured } from "@/lib/db/client";
import type { ActorContext } from "@/lib/auth/actor";
import type { PbdSubjectClassRecord, TpBand } from "@/types/pbd";

const bands: TpBand[] = ["TP1", "TP2", "TP3", "TP4", "TP5", "TP6"];

export type DatabasePbdSetup = {
  yearId: string | null;
  periodId: string | null;
  classes: Array<{ id: string; name: string; enrolledCount: number; levelKind: "tahun" | "tingkatan" | "peralihan"; levelNumber: number | null }>;
  subjects: Array<{ id: string; code: string; name: string }>;
  rows: Array<{ classSubjectId: string; className: string; subjectCode: string; subjectName: string; enrolledCount: number; entry: DatabasePbdEntry | null }>;
};

export type DatabasePbdEntry = {
  id: string;
  revision: number;
  status: "draft" | "final";
  enrolledCount: number;
  counts: Record<TpBand, number | null>;
  notAssessedCount: number | null;
};

const classInput = z.object({
  year: z.string().regex(/^\d{4}$/),
  name: z.string().trim().min(2).max(80),
  levelKind: z.enum(["tahun", "tingkatan", "peralihan"]),
  levelNumber: z.coerce.number().int().min(1).max(6).nullable(),
  enrolledCount: z.coerce.number().int().min(0).max(3000),
});

const subjectInput = z.object({
  code: z.string().trim().min(1).max(24).transform((value) => value.toLocaleUpperCase("ms")),
  name: z.string().trim().min(2).max(100),
});

const assignmentInput = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  year: z.string().regex(/^\d{4}$/),
  semester: z.enum(["1", "2"]),
});

const nullableCount = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.coerce.number().int().min(0).max(3000).nullable(),
);

const entryInput = z.object({
  classSubjectId: z.string().uuid(),
  year: z.string().regex(/^\d{4}$/),
  semester: z.enum(["1", "2"]),
  revision: z.coerce.number().int().min(0),
  action: z.enum(["save_draft", "finalize", "reopen"]),
  enrolledCount: z.coerce.number().int().min(0).max(3000),
  tp1: nullableCount,
  tp2: nullableCount,
  tp3: nullableCount,
  tp4: nullableCount,
  tp5: nullableCount,
  tp6: nullableCount,
  notAssessed: nullableCount,
});

export function parseDatabasePbdEntryInput(raw: unknown) {
  return entryInput.parse(raw);
}

export function validateDatabasePbdEntry(input: ReturnType<typeof parseDatabasePbdEntryInput>) {
  const counts = [input.tp1, input.tp2, input.tp3, input.tp4, input.tp5, input.tp6, input.notAssessed];
  if (input.action === "finalize" && counts.some((value) => value === null)) return "Lengkapkan semua nilai TP sebelum memuktamadkan.";
  const total = counts.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return input.action === "finalize" && total !== input.enrolledCount ? "Jumlah TP dan belum ditaksir mesti sama dengan jumlah murid." : null;
}

function requireDatabase() {
  if (!isDatabaseConfigured()) throw new Error("Pangkalan data belum dikonfigurasi.");
  return getDatabase();
}

async function ensureDatabaseSchool(context: ActorContext) {
  const school = context.school;
  const config = {
    ...school,
    assessmentPeriods: school.assessmentPeriods.map((period) => ({ ...period, spreadsheetId: "" })),
    pbdPeriods: school.pbdPeriods.map((period) => ({ ...period, spreadsheetId: "" })),
  };
  await requireDatabase()`
    INSERT INTO schools (id, code, slug, name, clerk_organization_id, config_json)
    VALUES (${school.id}, ${school.code}, ${school.slug}, ${school.name}, ${school.clerkOrganizationId ?? null}, ${JSON.stringify(config)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      code = EXCLUDED.code,
      slug = EXCLUDED.slug,
      name = EXCLUDED.name,
      clerk_organization_id = EXCLUDED.clerk_organization_id,
      updated_at = now()
  `;
}

async function ensureAcademicYearConstraint() {
  await requireDatabase()`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'academic_years'::regclass
          AND conname = 'academic_years_year_check'
          AND pg_get_constraintdef(oid) NOT LIKE '%[0-9]{4}%'
      ) THEN
        ALTER TABLE academic_years DROP CONSTRAINT academic_years_year_check;
        ALTER TABLE academic_years
          ADD CONSTRAINT academic_years_year_check CHECK (year ~ '^[0-9]{4}$');
      END IF;
    END
    $$
  `;
}

export async function usesDatabasePbdSource(schoolId: string) {
  if (!isDatabaseConfigured()) return false;
  const rows = await getDatabase()`SELECT pbd_source_mode FROM schools WHERE id = ${schoolId} LIMIT 1`;
  return rows[0]?.pbd_source_mode === "database";
}

function record(value: unknown) {
  return value as Record<string, unknown>;
}

function count(value: unknown) {
  return value === null || value === undefined ? null : Number(value);
}

function entryFromRow(row: Record<string, unknown>): DatabasePbdEntry {
  return {
    id: String(row.entry_id),
    revision: Number(row.revision),
    status: row.status === "final" ? "final" : "draft",
    enrolledCount: Number(row.enrolled_count),
    counts: {
      TP1: count(row.tp1_count), TP2: count(row.tp2_count), TP3: count(row.tp3_count),
      TP4: count(row.tp4_count), TP5: count(row.tp5_count), TP6: count(row.tp6_count),
    },
    notAssessedCount: count(row.not_assessed_count),
  };
}

async function ensureYearAndPeriod(context: ActorContext, year: string, semester: "1" | "2") {
  const sql = requireDatabase();
  const schoolId = context.school.id;
  const yearId = `${schoolId}:${year}`;
  const periodId = `${schoolId}:${year}:pbd:${semester}`;
  await sql.transaction((txn) => [
    txn`INSERT INTO academic_years (id, school_id, year) VALUES (${yearId}, ${schoolId}, ${year}) ON CONFLICT (school_id, year) DO NOTHING`,
    txn`INSERT INTO database_pbd_periods (id, school_id, academic_year_id, semester, name)
      VALUES (${periodId}, ${schoolId}, ${yearId}, ${semester}, ${`PBD ${year} Semester ${semester}`})
      ON CONFLICT (school_id, academic_year_id, semester) DO NOTHING`,
  ]);
  return { yearId, periodId };
}

export async function getDatabasePbdSetup(context: ActorContext, year: string, semester: "1" | "2" = "1"): Promise<DatabasePbdSetup> {
  if (!isDatabaseConfigured()) return { yearId: null, periodId: null, classes: [], subjects: [], rows: [] };
  await ensureDatabaseSchool(context);
  await ensureAcademicYearConstraint();
  const sql = getDatabase();
  const schoolId = context.school.id;
  const years = await sql`SELECT id FROM academic_years WHERE school_id = ${schoolId} AND year = ${year} LIMIT 1`;
  const yearId = years[0]?.id ? String(years[0].id) : null;
  const periods = yearId ? await sql`SELECT id FROM database_pbd_periods WHERE school_id = ${schoolId} AND academic_year_id = ${yearId} AND semester = ${semester} LIMIT 1` : [];
  let periodId = periods[0]?.id ? String(periods[0].id) : null;
  if (yearId && !periodId) {
    periodId = (await ensureYearAndPeriod(context, year, semester)).periodId;
  }
  const [classesRaw, subjectsRaw] = await Promise.all([
    yearId ? sql`SELECT id, name, enrolled_count, level_kind, level_number FROM school_classes WHERE school_id = ${schoolId} AND academic_year_id = ${yearId} AND active = true ORDER BY level_kind, level_number, name` : Promise.resolve([]),
    sql`SELECT id, code, name FROM school_subjects WHERE school_id = ${schoolId} AND active = true ORDER BY name`,
  ]);
  const classes = classesRaw.map((item) => ({ id: String(item.id), name: String(item.name), enrolledCount: Number(item.enrolled_count), levelKind: item.level_kind as DatabasePbdSetup["classes"][number]["levelKind"], levelNumber: item.level_number === null ? null : Number(item.level_number) }));
  const subjects = subjectsRaw.map((item) => ({ id: String(item.id), code: String(item.code), name: String(item.name) }));
  const rowsRaw = periodId ? await sql`
    SELECT cs.id AS class_subject_id, c.name AS class_name, s.code AS subject_code, s.name AS subject_name,
      c.enrolled_count, e.id AS entry_id, e.revision, e.status, e.tp1_count, e.tp2_count, e.tp3_count,
      e.tp4_count, e.tp5_count, e.tp6_count, e.not_assessed_count
    FROM class_subjects cs
    JOIN school_classes c ON c.id = cs.class_id AND c.school_id = ${schoolId}
    JOIN school_subjects s ON s.id = cs.subject_id AND s.school_id = ${schoolId}
    LEFT JOIN pbd_class_subject_entries e ON e.class_subject_id = cs.id AND e.period_id = ${periodId} AND e.school_id = ${schoolId}
    WHERE cs.school_id = ${schoolId} AND cs.active = true AND c.academic_year_id = ${yearId}
    ORDER BY c.name, s.name
  ` : [];
  return {
    yearId, periodId, classes, subjects,
    rows: rowsRaw.map((item) => ({ classSubjectId: String(item.class_subject_id), className: String(item.class_name), subjectCode: String(item.subject_code), subjectName: String(item.subject_name), enrolledCount: Number(item.enrolled_count), entry: item.entry_id ? entryFromRow(record(item)) : null })),
  };
}

export async function createDatabasePbdClass(context: ActorContext, raw: unknown) {
  const input = classInput.parse(raw);
  const sql = requireDatabase();
  await ensureDatabaseSchool(context);
  await ensureAcademicYearConstraint();
  const schoolId = context.school.id;
  const yearId = `${schoolId}:${input.year}`;
  await sql.transaction((txn) => [
    txn`INSERT INTO academic_years (id, school_id, year) VALUES (${yearId}, ${schoolId}, ${input.year}) ON CONFLICT (school_id, year) DO NOTHING`,
    txn`INSERT INTO school_classes (id, school_id, academic_year_id, name, level_kind, level_number, enrolled_count)
      VALUES (${randomUUID()}, ${schoolId}, ${yearId}, ${input.name}, ${input.levelKind}, ${input.levelNumber}, ${input.enrolledCount})`,
    txn`UPDATE schools SET pbd_source_mode = 'database', updated_at = now() WHERE id = ${schoolId}`,
  ]);
}

export async function createDatabasePbdSubject(context: ActorContext, raw: unknown) {
  const input = subjectInput.parse(raw);
  const sql = requireDatabase();
  await sql`INSERT INTO school_subjects (id, school_id, code, name) VALUES (${randomUUID()}, ${context.school.id}, ${input.code}, ${input.name})`;
}

export async function assignDatabasePbdSubject(context: ActorContext, raw: unknown) {
  const input = assignmentInput.parse(raw);
  const sql = requireDatabase();
  const schoolId = context.school.id;
  const valid = await sql`
    SELECT c.id AS class_id, s.id AS subject_id
    FROM school_classes c CROSS JOIN school_subjects s
    WHERE c.id = ${input.classId} AND c.school_id = ${schoolId} AND s.id = ${input.subjectId} AND s.school_id = ${schoolId}
  `;
  if (!valid.length) throw new Error("Kelas atau subjek tidak ditemui.");
  await ensureYearAndPeriod(context, input.year, input.semester);
  await sql`INSERT INTO class_subjects (id, school_id, class_id, subject_id) VALUES (${randomUUID()}, ${schoolId}, ${input.classId}, ${input.subjectId}) ON CONFLICT (school_id, class_id, subject_id) DO NOTHING`;
}

export async function saveDatabasePbdEntry(context: ActorContext, raw: unknown) {
  const input = parseDatabasePbdEntryInput(raw);
  const sql = requireDatabase();
  const schoolId = context.school.id;
  const { periodId } = await ensureYearAndPeriod(context, input.year, input.semester);
  const validationError = validateDatabasePbdEntry(input);
  if (validationError) throw new Error(validationError);
  const rows = await sql`
    SELECT e.*, cs.id AS valid_class_subject_id
    FROM class_subjects cs
    LEFT JOIN pbd_class_subject_entries e ON e.class_subject_id = cs.id AND e.period_id = ${periodId} AND e.school_id = ${schoolId}
    WHERE cs.id = ${input.classSubjectId} AND cs.school_id = ${schoolId}
    LIMIT 1
  `;
  if (!rows[0]) throw new Error("Rekod kelas-subjek tidak ditemui.");
  const existing = record(rows[0]);
  if (existing.id && Number(existing.revision) !== input.revision) throw new Error("Rekod ini telah dikemas kini. Muat semula sebelum menyimpan.");
  if (existing.id && existing.status === "final" && input.action !== "reopen") throw new Error("Buka semula rekod muktamad sebelum mengubahnya.");
  const nextStatus = input.action === "finalize" ? "final" : input.action === "reopen" ? "draft" : "draft";
  const entryId = existing.id ? String(existing.id) : randomUUID();
  const previous = existing.id ? entryFromRow({ ...existing, entry_id: existing.id }) : {};
  const next = { enrolledCount: input.enrolledCount, tp1: input.tp1, tp2: input.tp2, tp3: input.tp3, tp4: input.tp4, tp5: input.tp5, tp6: input.tp6, notAssessed: input.notAssessed, status: nextStatus };
  await sql.transaction((txn) => [
    existing.id
      ? txn`UPDATE pbd_class_subject_entries SET enrolled_count = ${input.enrolledCount}, tp1_count = ${input.tp1}, tp2_count = ${input.tp2}, tp3_count = ${input.tp3}, tp4_count = ${input.tp4}, tp5_count = ${input.tp5}, tp6_count = ${input.tp6}, not_assessed_count = ${input.notAssessed}, status = ${nextStatus}, revision = revision + 1, updated_by = ${context.actor.id}, updated_at = now() WHERE id = ${entryId} AND school_id = ${schoolId}`
      : txn`INSERT INTO pbd_class_subject_entries (id, school_id, period_id, class_subject_id, enrolled_count, tp1_count, tp2_count, tp3_count, tp4_count, tp5_count, tp6_count, not_assessed_count, status, updated_by) VALUES (${entryId}, ${schoolId}, ${periodId}, ${input.classSubjectId}, ${input.enrolledCount}, ${input.tp1}, ${input.tp2}, ${input.tp3}, ${input.tp4}, ${input.tp5}, ${input.tp6}, ${input.notAssessed}, ${nextStatus}, ${context.actor.id})`,
    txn`INSERT INTO pbd_entry_revisions (id, school_id, entry_id, actor_id, action, previous_json, next_json) VALUES (${randomUUID()}, ${schoolId}, ${entryId}, ${context.actor.id}, ${existing.id ? input.action : "create"}, ${JSON.stringify(previous)}::jsonb, ${JSON.stringify(next)}::jsonb)`,
  ]);
}

export async function getDatabasePbdRecords(context: ActorContext, year: string, semester: "1" | "2" = "1"): Promise<PbdSubjectClassRecord[]> {
  const setup = await getDatabasePbdSetup(context, year, semester);
  return setup.rows.flatMap((row) => {
    const entry = row.entry;
    if (!entry) return [];
    const counts = Object.fromEntries(bands.map((band) => [band, entry.counts[band] ?? 0])) as Record<TpBand, number>;
    const total = entry.enrolledCount;
    const low = counts.TP1 + counts.TP2;
    const high = counts.TP5 + counts.TP6;
    const complete = bands.every((band) => entry.counts[band] !== null) && entry.notAssessedCount !== null;
    const counted = bands.reduce((sum, band) => sum + counts[band], 0) + (entry.notAssessedCount ?? 0);
    return [{
      subjectCode: row.subjectCode, subjectName: row.subjectName, className: row.className,
      year: Number((row.className.match(/\d+/)?.[0]) ?? 0), tpCounts: counts,
      tpPercentages: Object.fromEntries(bands.map((band) => [band, total ? (counts[band] / total) * 100 : 0])) as Record<TpBand, number>,
      totalPupils: total, notAssessedCount: entry.notAssessedCount ?? 0, lowAchievementCount: low,
      lowAchievementPercentage: total ? (low / total) * 100 : 0, highAchievementCount: high,
      highAchievementPercentage: total ? (high / total) * 100 : 0,
      dominantTpBand: total ? bands.reduce<TpBand | null>((winner, band) => (!winner || counts[band] > counts[winner] ? band : winner), null) : null,
      dataIssues: !complete ? ["Draf belum lengkap"] : counted !== total ? ["Jumlah TP tidak sepadan dengan murid"] : entry.status !== "final" ? ["Draf belum dimuktamadkan"] : [],
    }];
  });
}
