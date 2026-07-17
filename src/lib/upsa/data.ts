import { unstable_cache } from "next/cache";
import { demoUpsaValues } from "@/lib/demo/data";
import { hasGoogleCredentials } from "@/lib/config/env";
import type { SchoolContext } from "@/lib/config/schools";
import type { AssessmentPeriod } from "@/lib/config/periods";
import { DataSourceError } from "@/lib/dataSourceError";
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
) {
  assertAssessmentSource(period);
  try {
    const values = hasGoogleCredentials
      ? await fetchSheetValues(period.spreadsheetId, `'${className}'!A1:AZ`)
      : await getPublicWorkbookSheetValues(period.spreadsheetId, className);
    if (!values) {
      if (process.env.NODE_ENV !== "production") return parseUpsaClassSheet(demoUpsaValues, className);
      throw new DataSourceError("sheet_missing", `Assessment class tab ${className} was not found.`, period.assessment);
    }
    const findings = validateAssessmentClassSheet(values, className);
    if (hasFatalFindings(findings)) throw new DataSourceError("schema_invalid", findings[0]!.message, period.assessment);
    return parseUpsaClassSheet(values, className);
  } catch (error) {
    if (error instanceof DataSourceError) throw error;
    throw new DataSourceError("workbook_inaccessible", `Assessment data could not be loaded for ${school.code}.`, period.assessment);
  }
}

async function loadAllAssessmentClassResults(school: SchoolContext, period: AssessmentPeriod, classNames?: string[]) {
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
        return parseUpsaClassSheet(sheetValues, classes[index]!);
      });
    } catch (error) {
      if (error instanceof DataSourceError) throw error;
      throw new DataSourceError("workbook_inaccessible", `Assessment data could not be loaded for ${school.code}.`, period.assessment);
    }
  }
  return Promise.all(classes.map((className) => getAssessmentClassResult(school, period, className)));
}

export async function getAllAssessmentClassResults(
  school: SchoolContext,
  period: AssessmentPeriod,
  classNames?: string[],
) {
  if (classNames) return loadAllAssessmentClassResults(school, period, classNames);
  return unstable_cache(
    () => loadAllAssessmentClassResults(school, period),
    ["all-assessment-class-results", ...assessmentCacheIdentity(school, period)],
    { tags: [`school:${school.id}:assessments`, `school:${school.id}:workbooks`], revalidate: 300 },
  )();
}
