import type { ActorContext } from "@/lib/auth/actor";
import type { AssessmentPeriod } from "@/lib/config/periods";
import { DataSourceError } from "@/lib/dataSourceError";
import { isDatabaseConfigured } from "@/lib/db/client";
import type { UpsaClassResult } from "@/types/upsa";
import { getSchoolRegistry } from "@/lib/db/schoolRegistry";
import { buildAllClassResultsFromDb, buildClassResultFromDb } from "@/lib/db/assessmentResults";

/**
 * DB-first hybrid fetcher for a single class.
 *
 * The Neon database is the primary (and only) data source: the result is read
 * straight from assessment_results (partial data is normal during marks entry
 * and is returned as-is). When no database is configured the fetcher raises a
 * DataSourceError instead of falling back to the deprecated Google Sheets
 * workbook path, so callers can present a "database required" state.
 */
export async function getAssessmentClassResultHybrid(
  context: ActorContext,
  period: AssessmentPeriod,
  className?: string,
): Promise<UpsaClassResult> {
  if (!isDatabaseConfigured()) {
    throw new DataSourceError("database_required", "Assessment data requires a connected database.", period.assessment);
  }
  const registry = await getSchoolRegistry(context, String(period.year));
  if (registry.academicYearId && className) {
    const dbResult = await buildClassResultFromDb(context, period, className, registry.academicYearId, registry);
    if (dbResult && dbResult.students.length > 0) return dbResult;
  }
  throw new DataSourceError("sheet_missing", `Assessment data for ${className ?? "this class"} was not found in the database.`, period.assessment);
}

/**
 * DB-first hybrid fetcher for all classes in a period.
 *
 * Results come exclusively from Neon. An empty array is returned when no
 * database is configured or nothing has been entered yet. The deprecated
 * Google Sheets workbook path is no longer used.
 */
export async function getAllAssessmentClassResultsHybrid(
  context: ActorContext,
  period: AssessmentPeriod,
  classNames?: string[],
): Promise<UpsaClassResult[]> {
  if (!isDatabaseConfigured()) return [];
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
