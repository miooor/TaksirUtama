import { unstable_cache } from "next/cache";
import { hasGoogleCredentials } from "@/lib/config/env";
import type { SchoolContext } from "@/lib/config/schools";
import { fetchSheetValues } from "@/lib/googleSheets/fetchSheetValues";
import { getPublicWorkbookSheetValues } from "@/lib/googleSheets/publicWorkbook";
import { listAssessmentClassTabs } from "@/lib/upsa/listUpsaClassTabs";
import { listPbdSubjectTabs } from "@/lib/pbd/data";
import { validateWorkbookConfig, type DataContractFinding } from "@/lib/readiness/dataContracts";

export type PeriodPreflight = {
  key: string;
  label: string;
  status: "ready" | "warning" | "fatal";
  findings: DataContractFinding[];
};

async function readConfig(spreadsheetId: string) {
  if (!spreadsheetId) return null;
  if (hasGoogleCredentials) return fetchSheetValues(spreadsheetId, "'_CONFIG'!A1:B20");
  if (process.env.NODE_ENV !== "production") return getPublicWorkbookSheetValues(spreadsheetId, "_CONFIG");
  return null;
}

function statusFor(findings: DataContractFinding[]): PeriodPreflight["status"] {
  return findings.some((finding) => finding.severity === "fatal") ? "fatal" : findings.length ? "warning" : "ready";
}

async function loadSchoolPreflight(school: SchoolContext): Promise<PeriodPreflight[]> {
  const reports: PeriodPreflight[] = [];
  for (const period of school.assessmentPeriods.filter((item) => item.enabled)) {
    const findings: DataContractFinding[] = [];
    if (!hasGoogleCredentials && process.env.NODE_ENV === "production") {
      findings.push({ severity: "fatal", code: "credentials_missing", location: "Google Sheets", message: "Kredential Google Sheets belum dikonfigurasi.", action: "Tetapkan akaun perkhidmatan Google pada Vercel." });
    } else if (!period.spreadsheetId) {
      findings.push({ severity: "fatal", code: "workbook_missing", location: `${period.assessment.toUpperCase()} ${period.year}`, message: "ID buku kerja belum dikonfigurasi.", action: "Tambah spreadsheetId dalam SCHOOLS_CONFIG." });
    } else {
      try {
        findings.push(...validateWorkbookConfig(await readConfig(period.spreadsheetId), school.code, "assessment"));
        const classes = await listAssessmentClassTabs(school, period);
        if (!classes.length) findings.push({ severity: "fatal", code: "class_tabs_missing", location: `${period.assessment.toUpperCase()} ${period.year}`, message: "Tiada tab kelas yang sah ditemui.", action: "Gunakan nama kelas bermula Tahun 1 hingga 6." });
      } catch {
        findings.push({ severity: "fatal", code: "workbook_inaccessible", location: `${period.assessment.toUpperCase()} ${period.year}`, message: "Buku kerja tidak dapat dibaca.", action: "Kongsi buku kerja dengan akaun perkhidmatan Google." });
      }
    }
    reports.push({ key: `${period.year}:${period.assessment}`, label: `${period.assessment.toUpperCase()} ${period.year}`, status: statusFor(findings), findings });
  }
  for (const period of school.pbdPeriods.filter((item) => item.enabled)) {
    const findings: DataContractFinding[] = [];
    if (!hasGoogleCredentials && process.env.NODE_ENV === "production") {
      findings.push({ severity: "fatal", code: "credentials_missing", location: "Google Sheets", message: "Kredential Google Sheets belum dikonfigurasi.", action: "Tetapkan akaun perkhidmatan Google pada Vercel." });
    } else if (!period.spreadsheetId) {
      findings.push({ severity: "fatal", code: "workbook_missing", location: `PBD ${period.year}`, message: "ID buku kerja belum dikonfigurasi.", action: "Tambah spreadsheetId dalam SCHOOLS_CONFIG." });
    } else {
      try {
        findings.push(...validateWorkbookConfig(await readConfig(period.spreadsheetId), school.code, "pbd"));
        const subjects = await listPbdSubjectTabs(school, period);
        if (!subjects.length) findings.push({ severity: "fatal", code: "subject_tabs_missing", location: `PBD ${period.year}`, message: "Tiada tab subjek ditemui.", action: "Tambah tab subjek daripada templat PBD rasmi." });
      } catch {
        findings.push({ severity: "fatal", code: "workbook_inaccessible", location: `PBD ${period.year}`, message: "Buku kerja tidak dapat dibaca.", action: "Kongsi buku kerja dengan akaun perkhidmatan Google." });
      }
    }
    reports.push({ key: `${period.year}:pbd`, label: `PBD ${period.year}`, status: statusFor(findings), findings });
  }
  return reports;
}

export async function getSchoolPreflightReport(school: SchoolContext) {
  return unstable_cache(
    () => loadSchoolPreflight(school),
    ["school-preflight", school.id, JSON.stringify(school.assessmentPeriods), JSON.stringify(school.pbdPeriods)],
    { tags: [`school:${school.id}:workbooks`, `school:${school.id}:assessments`, `school:${school.id}:pbd`], revalidate: 300 },
  )();
}
