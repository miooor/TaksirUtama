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
  return getAssessmentClassResult(context.school, period, className, registry);
}

export async function getAllAssessmentClassResultsWithRegistry(
  context: ActorContext,
  period: AssessmentPeriod,
  classNames?: string[],
) {
  const registry = isDatabaseConfigured()
    ? await getSchoolRegistry(context, String(period.year))
    : undefined;
  return getAllAssessmentClassResults(context.school, period, classNames, registry);
}
