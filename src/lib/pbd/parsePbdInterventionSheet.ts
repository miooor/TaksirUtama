import type { PbdInterventionIssue, PbdInterventionParseResult } from "@/types/intervention";

function normalize(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeKey(value: unknown) {
  return normalize(value).toUpperCase();
}

function headerIndexFor(headers: unknown[], label: string) {
  return headers.findIndex((cell) => normalizeKey(cell) === label);
}

function parseTp(value: unknown): 1 | 2 | null {
  const normalized = normalizeKey(value).replace(/\s+/g, "");
  if (normalized === "1" || normalized === "TP1") return 1;
  if (normalized === "2" || normalized === "TP2") return 2;
  return null;
}

function issue(
  subjectCode: string,
  rowNumber: number,
  row: unknown[],
  nameIndex: number,
  classIndex: number,
  reason: string,
): PbdInterventionIssue {
  return {
    subjectCode,
    rowNumber,
    studentName: normalize(row[nameIndex]),
    className: normalize(row[classIndex]),
    reason,
  };
}

export function parsePbdInterventionSheet(values: unknown[][], subjectCode: string): PbdInterventionParseResult {
  const titleIndex = values.findIndex((row) =>
    row.some((cell) => normalizeKey(cell).includes("INTERVENSI MURID TP 1 DAN 2")),
  );
  const headerIndex = values.findIndex(
    (row, index) =>
      index > titleIndex &&
      row.some((cell) => normalizeKey(cell) === "NAMA MURID") &&
      row.some((cell) => normalizeKey(cell) === "KELAS"),
  );

  if (titleIndex === -1 || headerIndex === -1) {
    return { entries: [], issues: [] };
  }

  const headers = values[headerIndex] ?? [];
  const nameIndex = headerIndexFor(headers, "NAMA MURID");
  const classIndex = headerIndexFor(headers, "KELAS");
  const tpIndex = headerIndexFor(headers, "TP");
  const problemIndex = headerIndexFor(headers, "MASALAH");
  const interventionIndex = headerIndexFor(headers, "INTERVENSI");

  if ([nameIndex, classIndex, tpIndex, problemIndex, interventionIndex].some((index) => index === -1)) {
    return { entries: [], issues: [] };
  }

  const entries: PbdInterventionParseResult["entries"] = [];
  const issues: PbdInterventionIssue[] = [];

  values.slice(headerIndex + 1).forEach((row, offset) => {
    const rowNumber = headerIndex + offset + 2;
    const studentName = normalize(row[nameIndex]);
    const className = normalize(row[classIndex]);
    const tpValue = parseTp(row[tpIndex]);
    const problem = normalize(row[problemIndex]);
    const intervention = normalize(row[interventionIndex]);
    const hasCandidateValue = [studentName, className, normalize(row[tpIndex]), problem, intervention].some(Boolean);

    if (!hasCandidateValue) {
      return;
    }

    if (!studentName || !/^[1-6]\s+\S+/.test(className) || tpValue === null) {
      issues.push(issue(subjectCode, rowNumber, row, nameIndex, classIndex, "Baris murid tidak lengkap atau tidak sah"));
      return;
    }

    if (!problem || !intervention) {
      issues.push(issue(subjectCode, rowNumber, row, nameIndex, classIndex, "Masalah atau intervensi belum lengkap"));
      return;
    }

    entries.push({
      subjectCode,
      studentName,
      normalizedStudentName: normalizeKey(studentName),
      className,
      normalizedClassName: normalizeKey(className),
      year: Number(className[0]),
      tp: tpValue,
      problem,
      intervention,
    });
  });

  return { entries, issues };
}
