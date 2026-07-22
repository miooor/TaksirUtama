import { unstable_cache } from "next/cache";
import { demoUpsaValues } from "@/lib/demo/data";
import { hasGoogleCredentials } from "@/lib/config/env";
import type { ActorContext } from "@/lib/auth/actor";
import type { SchoolContext } from "@/lib/config/schools";
import type { AssessmentPeriod } from "@/lib/config/periods";
import type { SchoolRegistry } from "@/types/registry";
import { DataSourceError } from "@/lib/dataSourceError";
import { isDatabaseConfigured } from "@/lib/db/client";
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

export async function getAllAssessmentClassResults(
  school: SchoolContext,
  period: AssessmentPeriod,
  classNames?: string[],
  registry?: SchoolRegistry,
) {
  if (classNames) return loadAllAssessmentClassResults(school, period, classNames, registry);
  return unstable_cache(
    () => loadAllAssessmentClassResults(school, period, undefined, registry),
    ["all-assessment-class-results", ...assessmentCacheIdentity(school, period)],
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
      if (dbResult && dbResult.students.length > 0) return dbResult;
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
      if (dbResults.length > 0) {
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
