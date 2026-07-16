import type { PbdSubjectClassRecord, TpBand } from "@/types/pbd";
import { normalizeSubjectCode, subjectDisplayName, subjectAliasKey } from "@/lib/subjects";

const bands: TpBand[] = ["TP1", "TP2", "TP3", "TP4", "TP5", "TP6"];

function toNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toClassName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function findHeaderIndex(header: unknown[], aliases: string[], fallback: number) {
  const normalizedAliases = new Set(aliases.map(subjectAliasKey));
  const index = header.findIndex((cell) => normalizedAliases.has(subjectAliasKey(cell)));
  return index >= 0 ? index : fallback;
}

export function parsePbdSubjectSheet(values: unknown[][], rawSubjectCode: string): PbdSubjectClassRecord[] {
  const headerIndex = values.findIndex((row) => row.some((cell) => subjectAliasKey(cell) === "KELAS"));
  if (headerIndex < 0) return [];
  const header = values[headerIndex] ?? [];
  const classColumn = findHeaderIndex(header, ["KELAS"], 1);
  const tpColumns = bands.map((band, index) => findHeaderIndex(header, [band, `TP ${index + 1}`, `BILANGAN ${band}`], classColumn + 1 + index * 2));
  const totalColumn = findHeaderIndex(header, ["JUMLAH MURID", "BILANGAN MURID", "JUMLAH"], classColumn + 13);
  const notAssessedColumn = findHeaderIndex(header, ["BILANGAN MURID TIDAK DITAKSIR", "MURID TIDAK DITAKSIR", "TIDAK DITAKSIR"], classColumn + 14);
  const metadataCell = values.flat().find((cell) => /PANITIA\s*:/i.test(String(cell ?? "")));
  const subjectCode = normalizeSubjectCode(rawSubjectCode);
  const metadataName = String(metadataCell ?? "").replace(/^PANITIA\s*:\s*/i, "").trim();
  const subjectName = metadataName ? subjectDisplayName(metadataName) : subjectDisplayName(subjectCode);

  return values.slice(headerIndex + 1).flatMap((row) => {
    const className = toClassName(row[classColumn]);
    if (!/^[1-6](?:\s+|-)/u.test(className)) return [];

    const rawTpValues = tpColumns.map((column) => row[column]);
    const tpCounts = Object.fromEntries(bands.map((band, index) => [band, toNumber(rawTpValues[index])])) as Record<TpBand, number>;
    const totalPupils = toNumber(row[totalColumn]);
    const notAssessedCount = toNumber(row[notAssessedColumn]);
    const tpTotal = bands.reduce((sum, band) => sum + tpCounts[band], 0);
    const denominator = totalPupils || tpTotal + notAssessedCount;
    const tpPercentages = Object.fromEntries(bands.map((band) => [band, denominator ? (tpCounts[band] / denominator) * 100 : 0])) as Record<TpBand, number>;
    const lowAchievementCount = tpCounts.TP1 + tpCounts.TP2;
    const highAchievementCount = tpCounts.TP5 + tpCounts.TP6;
    const dataIssues: string[] = [];
    const allTpBlank = rawTpValues.every((value) => value === "" || value === null || value === undefined);
    if (totalPupils && allTpBlank) dataIssues.push("Semua nilai TP belum diisi");
    if (totalPupils && tpTotal !== totalPupils - notAssessedCount) dataIssues.push("Jumlah TP tidak sepadan dengan jumlah murid");

    return [{
      subjectCode,
      subjectName,
      className,
      year: Number(className[0]),
      tpCounts,
      tpPercentages,
      totalPupils: denominator,
      notAssessedCount,
      lowAchievementCount,
      lowAchievementPercentage: denominator ? (lowAchievementCount / denominator) * 100 : 0,
      highAchievementCount,
      highAchievementPercentage: denominator ? (highAchievementCount / denominator) * 100 : 0,
      dominantTpBand: tpTotal ? bands.reduce<TpBand | null>((winner, band) => (!winner || tpCounts[band] > tpCounts[winner] ? band : winner), null) : null,
      dataIssues,
    }];
  });
}
