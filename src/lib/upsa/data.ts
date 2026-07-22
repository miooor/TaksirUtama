import { unstable_cache } from "next/cache";
import { demoUpsaValues } from "@/lib/demo/data";
import { hasGoogleCredentials } from "@/lib/config/env";
import type { ActorContext } from "@/lib/auth/actor";
import type { SchoolContext } from "@/lib/config/schools";
import type { AssessmentPeriod } from "@/lib/config/periods";
import type { SchoolRegistry } from "@/types/registry";
import { DataSourceError } from "@/lib/dataSourceError";
import { isDatabaseConfigured } from "@/lib/db/client";
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

async function getAssessmentClassResult(
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

async function getAllAssessmentClassResults(
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

async function getAssessmentClassResultWithRegistry(
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

async function getAllAssessmentClassResultsWithRegistry(
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
 * DB-first hybrid fetcher for a single class.
 *
 * The Neon database is the primary data source: when it is configured the
 * result is read straight from assessment_results (partial data is normal
 * during marks entry and is returned as-is). Google Sheets is only used as a
 * legacy fallback when no database is configured (dev/demo).
 */
export async function getAssessmentClassResultHybrid(
  context: ActorContext,
  period: AssessmentPeriod,
  className?: string,
): Promise<UpsaClassResult> {
  if (isDatabaseConfigured()) {
    const registry = await getSchoolRegistry(context, String(period.year));
    if (registry.academicYearId && className) {
      const dbResult = await buildClassResultFromDb(context, period, className, registry.academicYearId, registry);
      if (dbResult && dbResult.students.length > 0) return dbResult;
    }
    throw new DataSourceError("sheet_missing", `Assessment data for ${className ?? "this class"} was not found in the database.`, period.assessment);
  }
  // Fall back to Sheets (which also upserts to DB as a side effect)
  return getAssessmentClassResultWithRegistry(context, period, className);
}

/**
 * DB-first hybrid fetcher for all classes in a period.
 *
 * When the database is configured the results come exclusively from Neon; an
 * empty array is returned when nothing has been entered yet. Google Sheets is
 * only used as a legacy fallback when no database is configured (dev/demo).
 */
export async function getAllAssessmentClassResultsHybrid(
  context: ActorContext,
  period: AssessmentPeriod,
  classNames?: string[],
): Promise<UpsaClassResult[]> {
  if (isDatabaseConfigured()) {
    const registry = await getSchoolRegistry(context, String(period.year));
    if (registry.academicYearId) {
      const dbResults = await buildAllClassResultsFromDb(context, period, registry.academicYearId, registry);
      if (classNames) {
        const requested = new Set(classNames);
        return dbResults.filter((result) => requested.has(result.className));
      }
      return dbResults;
    }
    return [];
  }
  // Fall back to Sheets (which also upserts to DB as a side effect)
  return getAllAssessmentClassResultsWithRegistry(context, period, classNames);
}
