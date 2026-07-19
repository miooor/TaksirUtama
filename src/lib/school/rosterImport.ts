import type { RosterImportPreview, RosterImportRow, SchoolRegistry } from "@/types/registry";

export function normalizePupilName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLocaleUpperCase("ms");
}

function normalizeHeader(value: unknown) {
  return normalizePupilName(value).replace(/[^A-Z0-9]/g, "");
}

function text(value: unknown) {
  const result = String(value ?? "").trim().replace(/\s+/g, " ");
  return result || null;
}

function rosterNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseRosterMatrix(values: unknown[][]): RosterImportRow[] {
  const headerIndex = values.findIndex((row) => row.some((cell) => normalizeHeader(cell) === "NAMAMURID"));
  if (headerIndex === -1) throw new Error("Fail mesti mempunyai lajur NAMA_MURID.");
  const headers = values[headerIndex] ?? [];
  const index = (name: string) => headers.findIndex((cell) => normalizeHeader(cell) === name);
  const nameIndex = index("NAMAMURID");
  const classIndex = index("KELAS");
  const codeIndex = index("KODMURID");
  const numberIndex = index("BIL");
  if (classIndex === -1) throw new Error("Fail mesti mempunyai lajur KELAS.");

  return values.slice(headerIndex + 1).flatMap((row, offset) => {
    const displayName = text(row[nameIndex]);
    const className = text(row[classIndex]);
    if (!displayName && !className) return [];
    return [{
      rowNumber: headerIndex + offset + 2,
      pupilCode: codeIndex === -1 ? null : text(row[codeIndex]),
      displayName: displayName ?? "",
      className: className ?? "",
      rosterNumber: numberIndex === -1 ? null : rosterNumber(row[numberIndex]),
    }];
  });
}

export function parseRosterPaste(value: string, className: string): RosterImportRow[] {
  return value.split(/\r?\n/).flatMap((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return [];
    const tabParts = trimmed.split(/\t+/).map((item) => item.trim());
    const numbered = tabParts.length > 1 && /^\d+$/.test(tabParts[0] ?? "");
    return [{
      rowNumber: index + 1,
      pupilCode: null,
      displayName: numbered ? tabParts.slice(1).join(" ") : trimmed,
      className,
      rosterNumber: numbered ? Number(tabParts[0]) : null,
    }];
  });
}

export function buildRosterImportPreview(
  rows: RosterImportRow[],
  classes: Array<{ id: string; name: string; active: boolean }>,
  registry: SchoolRegistry,
): RosterImportPreview {
  const classByName = new Map(classes.filter((item) => item.active).map((item) => [normalizePupilName(item.name), item]));
  const studentsByCode = new Map(registry.students.flatMap((item) => item.pupilCode
    ? [[item.pupilCode.toLocaleUpperCase("ms"), item] as const]
    : []));
  const seenInput = new Set<string>();
  const previewRows = rows.map((row) => {
    const normalizedName = normalizePupilName(row.displayName);
    const targetClass = classByName.get(normalizePupilName(row.className)) ?? null;
    if (!normalizedName || !row.className) return { ...row, classId: targetClass?.id ?? null, studentId: null, enrollmentId: null, status: "error" as const, message: "Nama murid dan kelas diperlukan." };
    if (!targetClass) return { ...row, classId: null, studentId: null, enrollmentId: null, status: "error" as const, message: `Kelas ${row.className} tidak ditemui.` };
    // Names are not identities. Exact duplicate names are valid, so a row
    // without a pupil code only collides when its roster number also collides.
    const inputKey = row.pupilCode
      ? `CODE:${row.pupilCode.toLocaleUpperCase("ms")}`
      : `NAME:${targetClass.id}:${normalizedName}:${row.rosterNumber ?? `ROW-${row.rowNumber}`}`;
    if (seenInput.has(inputKey)) return { ...row, classId: targetClass.id, studentId: null, enrollmentId: null, status: "error" as const, message: "Baris pendua dalam import." };
    seenInput.add(inputKey);

    const codeStudent = row.pupilCode ? studentsByCode.get(row.pupilCode.toLocaleUpperCase("ms")) : null;
    const nameMatches = registry.enrollments.filter((item) => item.classId === targetClass.id && item.student.normalizedName === normalizedName);
    if (codeStudent) {
      const enrollment = registry.enrollments.find((item) => item.studentId === codeStudent.id) ?? null;
      if (enrollment && enrollment.classId !== targetClass.id) {
        return { ...row, classId: targetClass.id, studentId: codeStudent.id, enrollmentId: enrollment.id, status: "error" as const, message: `Kod murid telah didaftarkan dalam ${enrollment.className}.` };
      }
      return enrollment
        ? { ...row, classId: targetClass.id, studentId: codeStudent.id, enrollmentId: enrollment.id, status: "match" as const, message: "Sepadan melalui kod murid." }
        : { ...row, classId: targetClass.id, studentId: codeStudent.id, enrollmentId: null, status: "create" as const, message: "Pupil sedia ada akan didaftarkan ke kelas tahun ini." };
    }
    if (nameMatches.length > 1) return { ...row, classId: targetClass.id, studentId: null, enrollmentId: null, status: "error" as const, message: "Nama sepadan dengan lebih daripada satu murid. Tambah kod murid." };
    if (nameMatches.length === 1) {
      const enrollment = nameMatches[0]!;
      return { ...row, classId: targetClass.id, studentId: enrollment.studentId, enrollmentId: enrollment.id, status: "match" as const, message: "Murid telah berada dalam kelas ini." };
    }
    const rosterConflict = row.rosterNumber === null ? null : registry.enrollments.find((item) => item.classId === targetClass.id && item.active && item.rosterNumber === row.rosterNumber);
    if (rosterConflict) return { ...row, classId: targetClass.id, studentId: null, enrollmentId: null, status: "warning" as const, message: `Bil ${row.rosterNumber} telah digunakan; nombor akan dibiarkan kosong.` };
    return { ...row, classId: targetClass.id, studentId: null, enrollmentId: null, status: "create" as const, message: "Murid baharu akan ditambah." };
  });
  return {
    rows: previewRows,
    createCount: previewRows.filter((row) => row.status === "create" || row.status === "warning").length,
    matchCount: previewRows.filter((row) => row.status === "match").length,
    warningCount: previewRows.filter((row) => row.status === "warning").length,
    errorCount: previewRows.filter((row) => row.status === "error").length,
  };
}
