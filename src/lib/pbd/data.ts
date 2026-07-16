import { unstable_cache } from "next/cache";
import { hasGoogleCredentials } from "@/lib/config/env";
import type { SchoolContext } from "@/lib/config/schools";
import type { PbdPeriod } from "@/lib/config/periods";
import { DataSourceError } from "@/lib/dataSourceError";
import { fetchSheetValueRanges, fetchSheetValues } from "@/lib/googleSheets/fetchSheetValues";
import { getPublicWorkbookSheetNames, getPublicWorkbookSheetValues } from "@/lib/googleSheets/publicWorkbook";
import { getSpreadsheetMetadata } from "@/lib/googleSheets/getSpreadsheetMetadata";
import { getDemoPbdRecords } from "@/lib/pbd/analysis";
import { parsePbdInterventionSheet } from "@/lib/pbd/parsePbdInterventionSheet";
import { parsePbdSubjectSheet } from "@/lib/pbd/parsePbdSubjectSheet";
import { hasFatalFindings, validatePbdSubjectSheet } from "@/lib/readiness/dataContracts";
import { pbdCacheIdentity } from "@/lib/tenantCache";

function assertPbdSource(period: PbdPeriod) {
  if (!period.spreadsheetId) throw new DataSourceError("workbook_inaccessible", "PBD workbook is not configured.", "pbd");
  if (process.env.NODE_ENV === "production" && !hasGoogleCredentials) {
    throw new DataSourceError("credentials_missing", "Google Sheets credentials are not configured.", "pbd");
  }
}

export async function getPbdSubjectRecords(school: SchoolContext, period: PbdPeriod, subjectCode: string) {
  assertPbdSource(period);
  try {
    const values = hasGoogleCredentials
      ? await fetchSheetValues(period.spreadsheetId, `'${subjectCode}'!A1:AZ`)
      : await getPublicWorkbookSheetValues(period.spreadsheetId, subjectCode);
    if (values) {
      const findings = validatePbdSubjectSheet(values, subjectCode);
      if (hasFatalFindings(findings)) throw new DataSourceError("schema_invalid", findings[0]!.message, "pbd");
      return parsePbdSubjectSheet(values, subjectCode);
    }
    if (process.env.NODE_ENV !== "production") return getDemoPbdRecords().filter((record) => record.subjectCode === subjectCode);
    throw new DataSourceError("sheet_missing", `PBD subject tab ${subjectCode} was not found.`, "pbd");
  } catch (error) {
    if (error instanceof DataSourceError) throw error;
    throw new DataSourceError("workbook_inaccessible", `PBD data could not be loaded for ${school.code}.`, "pbd");
  }
}

export async function getPbdSubjectInterventions(_school: SchoolContext, period: PbdPeriod, subjectCode: string) {
  assertPbdSource(period);
  const values = hasGoogleCredentials
    ? await fetchSheetValues(period.spreadsheetId, `'${subjectCode}'!A1:AZ`)
    : await getPublicWorkbookSheetValues(period.spreadsheetId, subjectCode);
  return values ? parsePbdInterventionSheet(values, subjectCode) : { entries: [], issues: [] };
}

export async function listPbdSubjectTabs(_school: SchoolContext, period: PbdPeriod) {
  assertPbdSource(period);
  const names = hasGoogleCredentials
    ? await getSpreadsheetMetadata(period.spreadsheetId)
    : process.env.NODE_ENV !== "production"
      ? await getPublicWorkbookSheetNames(period.spreadsheetId)
      : null;
  return (names ?? []).filter((name) => name !== "_CONFIG");
}

async function loadAllPbdRecords(school: SchoolContext, period: PbdPeriod, subjects?: string[]) {
  assertPbdSource(period);
  const subjectTabs = subjects ?? await listPbdSubjectTabs(school, period);
  if (hasGoogleCredentials) {
    try {
      const values = await fetchSheetValueRanges(period.spreadsheetId, subjectTabs.map((subject) => `'${subject}'!A1:AZ`));
      if (!values) return [];
      return values.flatMap((sheetValues, index) => {
        const findings = validatePbdSubjectSheet(sheetValues, subjectTabs[index]!);
        if (hasFatalFindings(findings)) throw new DataSourceError("schema_invalid", findings[0]!.message, "pbd");
        return parsePbdSubjectSheet(sheetValues, subjectTabs[index]!);
      });
    } catch {
      throw new DataSourceError("workbook_inaccessible", `PBD data could not be loaded for ${school.code}.`, "pbd");
    }
  }
  return (await Promise.all(subjectTabs.map((subject) => getPbdSubjectRecords(school, period, subject)))).flat();
}

export async function getAllPbdRecords(school: SchoolContext, period: PbdPeriod, subjects?: string[]) {
  if (subjects) return loadAllPbdRecords(school, period, subjects);
  return unstable_cache(
    () => loadAllPbdRecords(school, period),
    ["all-pbd-records", ...pbdCacheIdentity(school, period)],
    { tags: [`school:${school.id}:pbd`, `school:${school.id}:workbooks`], revalidate: 300 },
  )();
}

async function loadAllPbdInterventions(school: SchoolContext, period: PbdPeriod) {
  const subjects = await listPbdSubjectTabs(school, period);
  const results = await Promise.all(subjects.map((subject) => getPbdSubjectInterventions(school, period, subject)));
  return { entries: results.flatMap((result) => result.entries), issues: results.flatMap((result) => result.issues) };
}

export async function getAllPbdInterventions(school: SchoolContext, period: PbdPeriod) {
  return unstable_cache(
    () => loadAllPbdInterventions(school, period),
    ["all-pbd-interventions", ...pbdCacheIdentity(school, period)],
    { tags: [`school:${school.id}:pbd`, `school:${school.id}:workbooks`], revalidate: 300 },
  )();
}

export async function listPbdClasses(school: SchoolContext, period: PbdPeriod) {
  return listPbdClassesFromRecords(await getAllPbdRecords(school, period));
}

export function listPbdClassesFromRecords(records: Awaited<ReturnType<typeof getAllPbdRecords>>) {
  return [...new Set(records.map((record) => record.className))].sort((a, b) => a.localeCompare(b, "ms"));
}
