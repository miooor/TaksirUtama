import { createHash } from "node:crypto";
import type { SchoolContext } from "@/lib/config/schools";
import type { WorkbookSourceType, WorkbookValidationResult } from "@/lib/dataSources/types";
import { fetchSheetValueRanges, fetchSheetValues } from "@/lib/googleSheets/fetchSheetValues";
import { getSpreadsheetMetadata } from "@/lib/googleSheets/getSpreadsheetMetadata";
import {
  hasFatalFindings,
  validateAssessmentClassSheet,
  validatePbdSubjectSheet,
  validateWorkbookConfig,
  type DataContractFinding,
} from "@/lib/readiness/dataContracts";
import { normalizeSubjectCode, subjectNames } from "@/lib/subjects";
import { parseUpsaClassSheet } from "@/lib/upsa/parseUpsaClassSheet";
import { parsePbdSubjectSheet } from "@/lib/pbd/parsePbdSubjectSheet";

const validClassPattern = /^[1-6](?:\s+|[-])(?=.*[\p{L}\p{N}])[\p{L}\p{N} .'-]+$/iu;

function configVersion(values: unknown[][] | null) {
  const row = values?.find((item) => String(item[0] ?? "").trim().toLocaleLowerCase("en") === "schemaversion");
  return row ? String(row[1] ?? "").trim() || null : null;
}

function finding(code: string, location: string, message: string, action: string, severity: "fatal" | "warning" = "fatal"): DataContractFinding {
  return { severity, code, location, message, action };
}

function assessmentDataFindings(values: unknown[][], tab: string) {
  const result = parseUpsaClassSheet(values, tab);
  const findings: DataContractFinding[] = [];
  const unknownSubjects = new Set<string>();
  for (const student of result.students) {
    for (const subject of student.subjects) {
      if (!(normalizeSubjectCode(subject.subjectCode) in subjectNames)) unknownSubjects.add(subject.subjectCode);
      if (subject.mark !== null && (subject.mark < 0 || subject.mark > subject.maxMark)) {
        findings.push(finding("mark_out_of_range", tab, "Terdapat markah di luar julat yang dibenarkan.", "Betulkan markah supaya berada antara 0 dan markah maksimum."));
        return findings;
      }
    }
  }
  for (const subject of unknownSubjects) {
    findings.push(finding("subject_alias", tab, `Subjek ${subject} belum dikenali.`, "Gunakan nama subjek daripada templat atau tambah alias terkawal.", "warning"));
  }
  if (!result.students.length) findings.push(finding("students_missing", tab, "Tiada rekod murid ditemui.", "Tambah rekod murid sebelum mengaktifkan buku kerja.", "warning"));
  return findings;
}

function pbdDataFindings(values: unknown[][], tab: string) {
  const records = parsePbdSubjectSheet(values, tab);
  const findings: DataContractFinding[] = [];
  if (!records.length) findings.push(finding("pbd_records_missing", tab, "Tiada rekod PBD ditemui.", "Tambah rekod kelas sebelum mengaktifkan buku kerja.", "warning"));
  if (records.some((record) => record.dataIssues.length > 0)) {
    findings.push(finding("pbd_totals", tab, "Sebahagian jumlah TP tidak sepadan dengan jumlah murid.", "Semak jumlah TP dan murid tidak ditaksir.", "warning"));
  }
  return findings;
}

export async function validateWorkbookConnection(
  school: SchoolContext,
  type: WorkbookSourceType,
  year: string,
  spreadsheetId: string,
  semester?: "1" | "2",
): Promise<WorkbookValidationResult> {
  try {
    const configValues = await fetchSheetValues(spreadsheetId, "'_CONFIG'!A1:B20");
    const tabs = await getSpreadsheetMetadata(spreadsheetId);
    if (!configValues || !tabs) {
      return {
        status: "inaccessible",
        schemaVersion: null,
        fingerprint: null,
        findings: [finding("workbook_inaccessible", `${type.toUpperCase()} ${year}`, "Buku kerja tidak dapat dibaca.", "Kongsi buku kerja sebagai Viewer dengan akaun perkhidmatan yang dipaparkan.")],
      };
    }

    const expectedType = type;
    const findings = validateWorkbookConfig(configValues, school.code, expectedType, year, semester);
    const dataTabs = type === "pbd"
      ? tabs.filter((tab) => tab !== "_CONFIG")
      : tabs.filter((tab) => validClassPattern.test(tab));
    if (!dataTabs.length) {
      findings.push(finding(type === "pbd" ? "subject_tabs_missing" : "class_tabs_missing", `${type.toUpperCase()} ${year}`, type === "pbd" ? "Tiada tab subjek ditemui." : "Tiada tab kelas Tahun 1 hingga 6 ditemui.", "Gunakan tab daripada templat rasmi."));
    }

    const ranges = dataTabs.map((tab) => `'${tab.replaceAll("'", "''")}'!A1:AZ`);
    const dataValues = ranges.length ? await fetchSheetValueRanges(spreadsheetId, ranges) : [];
    if (ranges.length && !dataValues) {
      findings.push(finding("sheet_values_inaccessible", `${type.toUpperCase()} ${year}`, "Kandungan tab tidak dapat dibaca.", "Semak kebenaran perkongsian buku kerja."));
    }
    for (let index = 0; index < (dataValues?.length ?? 0); index += 1) {
      const tab = dataTabs[index]!;
      const values = dataValues![index]!;
      if (type === "pbd") {
        findings.push(...validatePbdSubjectSheet(values, tab), ...pbdDataFindings(values, tab));
      } else {
        findings.push(...validateAssessmentClassSheet(values, tab), ...assessmentDataFindings(values, tab));
      }
    }

    const fingerprint = createHash("sha256")
      .update(JSON.stringify({ schoolId: school.id, type, year, spreadsheetId, configValues, dataTabs, dataValues }))
      .digest("hex");
    return {
      status: hasFatalFindings(findings) ? "fatal" : findings.length ? "warning" : "ready",
      schemaVersion: configVersion(configValues),
      fingerprint,
      findings,
    };
  } catch {
    return {
      status: "inaccessible",
      schemaVersion: null,
      fingerprint: null,
      findings: [finding("workbook_inaccessible", `${type.toUpperCase()} ${year}`, "Buku kerja tidak dapat dibaca.", "Kongsi buku kerja sebagai Viewer dengan akaun perkhidmatan yang dipaparkan.")],
    };
  }
}
