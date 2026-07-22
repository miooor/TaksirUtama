import { unstable_cache } from "next/cache";
import { demoUpsaValues } from "@/lib/demo/data";
import { hasGoogleCredentials } from "@/lib/config/env";
import type { ActorContext } from "@/lib/auth/actor";
import type { SchoolContext } from "@/lib/config/schools";
import type { AssessmentPeriod } from "@/lib/config/periods";
import type { SchoolRegistry } from "@/types/registry";
import { DataSourceError } from "@/lib/dataSourceError";
import { getDatabase, isDatabaseConfigured } from "@/lib/db/client";
import type { UpsaClassResult } from "@/types/upsa";
import { getSchoolRegistry } from "@/lib/db/schoolRegistry";
import { buildAllClassResultsFromDb, buildClassResultFromDb, upsertAssessmentResults } from "@/lib/db/assessmentResults";
import { fetchSheetValueRanges, fetchSheetValues } from "@/lib/googleSheets/fetchSheetValues";
import { getPublicWorkbookSheetValues } from "@/lib/googleSheets/publicWorkbook";
import { parseUpsaClassSheet } from "@/lib/upsa/parseUpsaClassSheet";
import { listAssessmentClassTabs } from "@/lib/upsa/listUpsaClassTabs";
import { hasFatalFindings, validateAssessmentClassSheet } from "@/lib/readiness/dataContracts";
import { assessmentCacheIdentity } from "@/lib/tenantCache";

function assertAssessmentSource(period: AssessmentPeriod) {
  if (!period.spreadsheetId) {
    throw new DataSourceError("workbook_inaccessible", "Assessment workbook is not configured.", period.assessment);
  }
  if (process.env.NODE_ENV === "production" && !hasGoogleCredentials) {
    throw new DataSourceError("credentials_missing", "Google Sheets credentials are not configured.", period.assessment);
  }
}

export async function getAssessmentClassResult(
  school: SchoolContext,
  period: AssessmentPeriod,
  className = "4 ANGSANA",
  registry?: SchoolRegistry,
) {
  assertAssessmentSource(period);
  try {
    const values = hasGoogleCredentials
      ? await fetchSheetValues(period.spreadsheetId, `'${className}'!A1:AZ`)
      : await getPublicWorkbookSheetValues(period.spreadsheetId, className);
    if (!values) {
      if (process.env.NODE_ENV !== "production") return parseUpsaClassSheet(demoUpsaValues, className, registry);
      throw new DataSourceError("sheet_missing", `Assessment class tab ${className} was not found.`, period.assessment);
    }
    const findings = validateAssessmentClassSheet(values, className);
    if (hasFatalFindings(findings)) throw new DataSourceError("schema_invalid", findings[0]!.message, period.assessment);
    return parseUpsaClassSheet(values, className, registry);
  } catch (error) {
    if (error instanceof DataSourceError) throw error;
    throw new DataSourceError("workbook_inaccessible", `Assessment data could not be loaded for ${school.code}.`, period.assessment);
  }
}

async function loadAllAssessmentClassResults(school: SchoolContext, period: AssessmentPeriod, classNames?: string[], registry?: SchoolRegistry) {
  assertAssessmentSource(period);
  const classes = classNames ?? await listAssessmentClassTabs(school, period);
  if (hasGoogleCredentials) {
    try {
      const values = await fetchSheetValueRanges(
        period.spreadsheetId,
        classes.map((className) => `'${className}'!A1:AZ`),
      );
      if (!values) return [];
      return values.map((sheetValues, index) => {
        const findings = validateAssessmentClassSheet(sheetValues, classes[index]!);
        if (hasFatalFindings(findings)) throw new DataSourceError("schema_invalid", findings[0]!.message, period.assessment);
        return parseUpsaClassSheet(sheetValues, classes[index]!, registry);
      });
    } catch (error) {
      if (error instanceof DataSourceError) throw error;
      throw new DataSourceError("workbook_inaccessible", `Assessment data could not be loaded for ${school.code}.`, period.assessment);
    }
  }
  return Promise.all(classes.map((className) => getAssessmentClassResult(school, period, className, registry)));
}

// The cached result depends on whether a registry was supplied, so the cache
// key must distinguish registry-aware entries from plain ones. Otherwise a
// non-registry caller (e.g. the classes page) and a registry-aware caller
// (readiness page / registry APIs) would poison each other's cached students.
function registryCacheSegment(registry?: SchoolRegistry): string {
  return registry ? `registry:${registry.academicYearId ?? "no-year"}` : "no-registry";
}

export async function getAllAssessmentClassResults(
  school: SchoolContext,
  period: AssessmentPeriod,
  classNames?: string[],
  registry?: SchoolRegistry,
) {
  if (classNames) return loadAllAssessmentClassResults(school, period, classNames, registry);
  return unstable_cache(
    () => loadAllAssessmentClassResults(school, period, undefined, registry),
    ["all-assessment-class-results", registryCacheSegment(registry), ...assessmentCacheIdentity(school, period)],
    { tags: [`school:${school.id}:assessments`, `school:${school.id}:workbooks`], revalidate: 300 },
  )();
}

export async function getAssessmentClassResultWithRegistry(
  context: ActorContext,
  period: AssessmentPeriod,
  className?: string,
) {
  const registry = isDatabaseConfigured()
    ? await getSchoolRegistry(context, String(period.year))
    : undefined;
  const result = await getAssessmentClassResult(context.school, period, className, registry);

  // Fire-and-forget: persist matched results to Neon for future DB-first reads.
  if (registry?.academicYearId && result.students.some((s) => s.matchStatus === "matched")) {
    const targetEnrollment = registry.enrollments.find(
      (e) => e.className === result.className && e.active,
    );
    if (targetEnrollment) {
      upsertAssessmentResults(context, period, result, targetEnrollment.classId, registry.academicYearId).catch(() => {
        // Silently ignore write failures — sheet data is still returned to the caller.
      });
    }
  }

  return result;
}

export async function getAllAssessmentClassResultsWithRegistry(
  context: ActorContext,
  period: AssessmentPeriod,
  classNames?: string[],
) {
  const registry = isDatabaseConfigured()
    ? await getSchoolRegistry(context, String(period.year))
    : undefined;
  const results = await getAllAssessmentClassResults(context.school, period, classNames, registry);

  // Fire-and-forget: persist matched results to Neon for future DB-first reads.
  if (registry?.academicYearId && results.length > 0) {
    for (const result of results) {
      if (!result.students.some((s) => s.matchStatus === "matched")) continue;
      const targetEnrollment = registry.enrollments.find(
        (e) => e.className === result.className && e.active,
      );
      if (targetEnrollment) {
        upsertAssessmentResults(context, period, result, targetEnrollment.classId, registry.academicYearId).catch(() => {});
      }
    }
  }

  return results;
}

/**
 * A DB snapshot for a class is only a safe substitute for the source spreadsheet
 * when it is complete: every active enrollment for the class must be present and
 * every subject assigned to the class must have results. Otherwise a single
 * persisted pupil/subject (e.g. right after entering one class-subject, or a
 * Sheets import that matched only some pupils) would be returned as the whole
 * class and slips/analysis/CSV/PDF would silently omit the rest.
 */
async function isDbClassSnapshotComplete(
  context: ActorContext,
  classId: string,
  academicYearId: string,
  dbResult: UpsaClassResult,
  registry: SchoolRegistry,
): Promise<boolean> {
  const sql = getDatabase();
  const schoolId = context.school.id;

  // Pupil coverage: every active enrollment for the class must be present.
  const enrolledIds = registry.enrollments.filter((e) => e.classId === classId && e.active).map((e) => e.id);
  if (enrolledIds.length === 0) return false;
  const presentIds = new Set(dbResult.students.map((s) => s.enrollmentId));
  for (const id of enrolledIds) {
    if (!presentIds.has(id)) return false;
  }

  // Subject coverage: every subject assigned to the class must have results.
  const subjectRows = await sql`
    SELECT s.code FROM class_subjects cs
    JOIN school_subjects s ON s.id = cs.subject_id AND s.school_id = ${schoolId}
    WHERE cs.class_id = ${classId} AND cs.school_id = ${schoolId} AND cs.active = true
  `;
  const expectedCodes = subjectRows.map((row) => String(row.code));
  if (expectedCodes.length === 0) return true; // no subject config yet; pupil coverage suffices
  const presentCodes = new Set(dbResult.students.flatMap((s) => s.subjects.map((sj) => sj.subjectCode)));
  for (const code of expectedCodes) {
    if (!presentCodes.has(code)) return false;
  }
  return true;
}

/**
 * Completeness gate for the all-classes DB snapshot: every class that has active
 * enrollments must be present in the DB results and itself complete.
 */
async function areAllDbClassSnapshotsComplete(
  context: ActorContext,
  academicYearId: string,
  dbResults: UpsaClassResult[],
  registry: SchoolRegistry,
): Promise<boolean> {
  const classesWithEnrollments = new Map<string, string>();
  for (const enrollment of registry.enrollments) {
    if (enrollment.active && !classesWithEnrollments.has(enrollment.classId)) {
      classesWithEnrollments.set(enrollment.classId, enrollment.className);
    }
  }
  if (classesWithEnrollments.size === 0) return false;
  const dbByClassName = new Map(dbResults.map((result) => [result.className, result]));
  for (const [classId, className] of classesWithEnrollments) {
    const dbResult = dbByClassName.get(className);
    if (!dbResult || dbResult.students.length === 0) return false;
    if (!(await isDbClassSnapshotComplete(context, classId, academicYearId, dbResult, registry))) return false;
  }
  return true;
}

/**
 * DB-first hybrid fetcher for a single class.
 * Tries to read from assessment_results in Neon; falls back to Google Sheets
 * (which also upserts to DB as a side effect for next time).
 */
export async function getAssessmentClassResultHybrid(
  context: ActorContext,
  period: AssessmentPeriod,
  className?: string,
) {
  if (isDatabaseConfigured()) {
    const registry = await getSchoolRegistry(context, String(period.year));
    if (registry.academicYearId && className) {
      const dbResult = await buildClassResultFromDb(context, period, className, registry.academicYearId, registry);
      const classId = registry.enrollments.find((e) => e.className === className && e.active)?.classId;
      if (
        dbResult && dbResult.students.length > 0 && classId &&
        (await isDbClassSnapshotComplete(context, classId, registry.academicYearId, dbResult, registry))
      ) {
        return dbResult;
      }
    }
  }
  // Fall back to Sheets (which also upserts to DB as a side effect)
  return getAssessmentClassResultWithRegistry(context, period, className);
}

/**
 * DB-first hybrid fetcher for all classes in a period.
 * Tries to read all results from Neon; falls back to Google Sheets.
 */
export async function getAllAssessmentClassResultsHybrid(
  context: ActorContext,
  period: AssessmentPeriod,
  classNames?: string[],
) {
  if (isDatabaseConfigured()) {
    const registry = await getSchoolRegistry(context, String(period.year));
    if (registry.academicYearId) {
      const dbResults = await buildAllClassResultsFromDb(context, period, registry.academicYearId, registry);
      if (dbResults.length > 0 && (await areAllDbClassSnapshotsComplete(context, registry.academicYearId, dbResults, registry))) {
        // If specific classNames were requested, filter to those
        if (classNames) {
          const requested = new Set(classNames);
          const filtered = dbResults.filter((r) => requested.has(r.className));
          if (filtered.length > 0) return filtered;
        } else {
          return dbResults;
        }
      }
    }
  }
  // Fall back to Sheets (which also upserts to DB as a side effect)
  return getAllAssessmentClassResultsWithRegistry(context, period, classNames);
}
