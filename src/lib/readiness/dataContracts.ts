export type ReadinessSeverity = "fatal" | "warning";

export type DataContractFinding = {
  severity: ReadinessSeverity;
  code: string;
  location: string;
  message: string;
  action: string;
};

function normalized(value: unknown) {
  return String(value ?? "").trim().toLocaleUpperCase("ms").replace(/[^A-Z0-9]/g, "");
}

function findHeader(values: unknown[][], label: string) {
  const target = normalized(label);
  const row = values.findIndex((cells) => cells.some((cell) => normalized(cell) === target));
  const column = row >= 0 ? values[row]!.findIndex((cell) => normalized(cell) === target) : -1;
  return { row, column };
}

export function validateWorkbookConfig(
  values: unknown[][] | null,
  expectedSchoolCode: string,
  expectedType: "upsa" | "uasa" | "pbd",
  expectedYear?: string,
  expectedSemester?: "1" | "2",
): DataContractFinding[] {
  if (!values) {
    return [{ severity: "fatal", code: "config_missing", location: "_CONFIG", message: "Tab _CONFIG tidak ditemui.", action: "Salin tab _CONFIG daripada templat rasmi." }];
  }
  const entries = new Map(values.map((row) => [normalized(row[0]), String(row[1] ?? "").trim()]));
  const findings: DataContractFinding[] = [];
  if (entries.get("SCHEMAVERSION") !== "1") findings.push({ severity: "fatal", code: "schema_version", location: "_CONFIG", message: "Versi skema tidak disokong.", action: "Gunakan templat versi 1." });
  if (normalized(entries.get("SCHOOLCODE")) !== normalized(expectedSchoolCode)) findings.push({ severity: "fatal", code: "school_code", location: "_CONFIG", message: "Kod sekolah tidak sepadan dengan sesi semasa.", action: "Betulkan schoolCode dalam tab _CONFIG." });
  if (normalized(entries.get("WORKBOOKTYPE")) !== normalized(expectedType)) findings.push({ severity: "fatal", code: "workbook_type", location: "_CONFIG", message: "Jenis buku kerja tidak sepadan.", action: `Tetapkan workbookType kepada ${expectedType}.` });
  if (expectedYear !== undefined && entries.get("YEAR") !== expectedYear) findings.push({ severity: "fatal", code: "year_mismatch", location: "_CONFIG", message: `Tahun tidak sepadan. Dijangka ${expectedYear}.`, action: `Tetapkan year kepada ${expectedYear}.` });
  if (expectedSemester !== undefined && entries.get("SEMESTER") !== expectedSemester) findings.push({ severity: "fatal", code: "semester_mismatch", location: "_CONFIG", message: `Semester tidak sepadan. Dijangka ${expectedSemester}.`, action: `Tetapkan semester kepada ${expectedSemester}.` });
  return findings;
}

export function validateAssessmentClassSheet(values: unknown[][], tabName: string): DataContractFinding[] {
  const bil = findHeader(values, "BIL");
  if (bil.row < 0) return [{ severity: "fatal", code: "assessment_header", location: tabName, message: "Header BIL tidak ditemui.", action: "Gunakan susun atur templat pentaksiran rasmi." }];
  const header = values[bil.row] ?? [];
  const findings: DataContractFinding[] = [];
  if (!["NAMA", "SUBJEK"].includes(normalized(header[bil.column + 1]))) findings.push({ severity: "fatal", code: "student_name", location: `${tabName}!R${bil.row + 1}`, message: "Kolum NAMA atau SUBJEK mesti berada selepas BIL.", action: "Betulkan header murid mengikut templat." });
  const subjectHeaders = header.slice(bil.column + 2);
  if (!subjectHeaders.some((cell) => normalized(cell) && normalized(cell) !== "GRED")) findings.push({ severity: "fatal", code: "subjects_missing", location: `${tabName}!R${bil.row + 1}`, message: "Tiada subjek ditemui.", action: "Tambah pasangan kolum subjek dan GRED." });
  for (let index = bil.column + 2; index < header.length; index += 2) {
    if (!String(header[index] ?? "").trim()) continue;
    if (normalized(header[index + 1]) !== "GRED") findings.push({ severity: "fatal", code: "grade_pair", location: `${tabName}!C${index + 2}`, message: "Setiap kolum subjek mesti diikuti kolum GRED.", action: "Susun kolum subjek dan GRED secara berpasangan." });
  }
  return findings;
}

export function validatePbdSubjectSheet(values: unknown[][], tabName: string): DataContractFinding[] {
  const kelas = findHeader(values, "KELAS");
  if (kelas.row < 0) return [{ severity: "fatal", code: "pbd_header", location: tabName, message: "Header KELAS tidak ditemui.", action: "Gunakan susun atur templat PBD rasmi." }];
  const headerKeys = new Set((values[kelas.row] ?? []).map(normalized));
  const findings: DataContractFinding[] = [];
  for (let band = 1; band <= 6; band += 1) {
    if (!headerKeys.has(`TP${band}`) && !headerKeys.has(`BILANGANTP${band}`)) findings.push({ severity: "fatal", code: `tp${band}_missing`, location: `${tabName}!R${kelas.row + 1}`, message: `Header TP${band} tidak ditemui.`, action: `Tambah kolum kiraan TP${band}.` });
  }
  if (!["JUMLAHMURID", "BILANGANMURID", "JUMLAH"].some((key) => headerKeys.has(key))) findings.push({ severity: "fatal", code: "total_missing", location: `${tabName}!R${kelas.row + 1}`, message: "Header jumlah murid tidak ditemui.", action: "Tambah kolum JUMLAH MURID." });
  if (!["BILANGANMURIDTIDAKDITAKSIR", "MURIDTIDAKDITAKSIR", "TIDAKDITAKSIR"].some((key) => headerKeys.has(key))) findings.push({ severity: "warning", code: "not_assessed_missing", location: `${tabName}!R${kelas.row + 1}`, message: "Header murid tidak ditaksir tidak ditemui.", action: "Tambah kolum BILANGAN MURID TIDAK DITAKSIR." });
  return findings;
}

export function hasFatalFindings(findings: DataContractFinding[]) {
  return findings.some((finding) => finding.severity === "fatal");
}
