import type { UpsaClassResult, UpsaStudentResult, UpsaSubjectResult } from "@/types/upsa";
import { getAbsentUpsaSubjectCodes, getMissingUpsaSubjectCodes } from "@/lib/upsa/subjectPolicy";
import { normalizeSubjectCode, subjectDisplayName } from "@/lib/subjects";

function normalizeCell(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLabel(value: unknown) {
  return normalizeCell(value).toLocaleUpperCase("ms").replace(/[^A-Z0-9]/g, "");
}

function findMetadataValue(values: unknown[][], label: string) {
  const target = normalizeLabel(label);
  const row = values.find((cells) => normalizeLabel(cells[0]) === target);
  return normalizeCell(row?.[1]);
}

function isAbsentMark(value: unknown) {
  const normalized = normalizeCell(value).toUpperCase();
  return normalized === "TH" || normalized === "TAK HADIR";
}

function toNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseUpsaClassSheet(values: unknown[][], fallbackClassName: string): UpsaClassResult {
  const headerIndex = values.findIndex((row) => normalizeLabel(row[0]) === "BIL");
  const headerRow = values[headerIndex] ?? [];
  const maxMarkRow = values[headerIndex + 1] ?? [];
  const assessmentName = findMetadataValue(values, "PENTAKSIRAN");
  const schoolCode = findMetadataValue(values, "KOD SEKOLAH");
  const className = findMetadataValue(values, "KELAS") || fallbackClassName;
  const teacherName = findMetadataValue(values, "NAMA GURU KELAS") || "Belum ditetapkan";
  const headteacherName = findMetadataValue(values, "NAMA GURU BESAR");

  const subjects: Array<{ index: number; code: string; maxMark: number }> = [];
  for (let index = 2; index < headerRow.length; index += 2) {
    const code = normalizeSubjectCode(headerRow[index]);
    if (!code) continue;
    subjects.push({ index, code, maxMark: toNumber(maxMarkRow[index]) ?? 100 });
  }

  const students = values.slice(headerIndex + 2).flatMap((row, offset) => {
    const name = String(row[1] ?? "").trim();
    if (!name) return [];

    const parsedSubjects: UpsaSubjectResult[] = subjects.map(({ index, code, maxMark }) => {
      const rawMark = row[index];
      const status = isAbsentMark(rawMark) ? "absent" : toNumber(rawMark) === null ? "missing" : "marked";
      const mark = status === "marked" ? toNumber(rawMark) : null;
      return {
        subjectCode: code,
        subjectName: subjectDisplayName(code),
        mark,
        maxMark,
        grade: status === "marked" ? normalizeCell(row[index + 1]) || null : null,
        status,
      };
    });
    const validSubjects = parsedSubjects.filter((subject) => subject.mark !== null);
    const totalMarks = validSubjects.reduce((sum, subject) => sum + (subject.mark ?? 0), 0);
    const average = validSubjects.length ? totalMarks / validSubjects.length : null;

    const student: UpsaStudentResult = {
      id: `${className}-${offset + 1}`,
      bil: String(row[0] ?? ""),
      name,
      className,
      teacherName,
      subjects: parsedSubjects,
      average,
      totalMarks: validSubjects.length ? totalMarks : null,
      validSubjectCount: validSubjects.length,
      missingSubjects: getMissingUpsaSubjectCodes(parsedSubjects),
      absentSubjects: getAbsentUpsaSubjectCodes(parsedSubjects),
    };
    return [student];
  });

  return {
    assessmentName: assessmentName || undefined,
    schoolCode: schoolCode || undefined,
    className,
    teacherName,
    headteacherName: headteacherName || undefined,
    students,
  };
}
