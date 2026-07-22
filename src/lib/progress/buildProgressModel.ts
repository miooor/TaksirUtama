import type { AggregateMovement, ProgressModel } from "@/types/progress";
import { flattenResults, matchPupils } from "./matchPupils";
import { buildPupilMovements } from "./pupilMovement";
import { aggregateMovements, aggregateSchool } from "./aggregateMovement";
import { buildPbdSemesterMovements, type PbdRecordInput } from "./pbdSemesterMovement";
import { buildCombinedEvidence } from "./combinedEvidence";
import { subjectDisplayName } from "@/lib/subjects";

/** Input shape for the progress model builder. */
export type ProgressInput = {
  year: string;
  level: number | null;
  upsaClassResults: Array<{
    className: string;
    students: Array<{
      studentId: string | null;
      name: string;
      className: string;
      subjects: Array<{
        subjectCode: string;
        mark: number | null;
        maxMark: number;
        status: "marked" | "missing" | "absent";
      }>;
    }>;
  }> | null;
  uasaClassResults: Array<{
    className: string;
    students: Array<{
      studentId: string | null;
      name: string;
      className: string;
      subjects: Array<{
        subjectCode: string;
        mark: number | null;
        maxMark: number;
        status: "marked" | "missing" | "absent";
      }>;
    }>;
  }> | null;
  pbdSem1Records: PbdRecordInput[] | null;
  pbdSem2Records: PbdRecordInput[] | null;
};

/**
 * Build the complete progress model from raw assessment and PBD data.
 * This is the main orchestrator for the comparison engine.
 */
export function buildProgressModel(input: ProgressInput): ProgressModel {
  const warnings: string[] = [];

  // --- Examination movement (UPSA → UASA) ---
  const hasUpsa = input.upsaClassResults !== null && input.upsaClassResults.length > 0;
  const hasUasa = input.uasaClassResults !== null && input.uasaClassResults.length > 0;

  let pupilMovements: ProgressModel["pupilMovements"] = [];
  let classMovements: AggregateMovement[] = [];
  let subjectMovements: AggregateMovement[] = [];
  let schoolMovement: AggregateMovement | null = null;
  let matchedInBoth = 0;
  let upsaOnlyCount = 0;
  let uasaOnlyCount = 0;
  let unmatchedCount = 0;
  let totalEnrolled = 0;

  if (hasUpsa && hasUasa) {
    const upsaEntries = flattenResults(input.upsaClassResults!);
    const uasaEntries = flattenResults(input.uasaClassResults!);
    const matchResult = matchPupils(upsaEntries, uasaEntries);

    pupilMovements = buildPupilMovements(matchResult.matched);
    matchedInBoth = matchResult.matched.length;
    upsaOnlyCount = matchResult.upsaOnly.length;
    uasaOnlyCount = matchResult.uasaOnly.length;
    unmatchedCount = matchResult.unmatched.length;
    totalEnrolled = upsaEntries.length;

    // Filter by level if specified
    const filtered = input.level !== null
      ? pupilMovements.filter((m) => Number(m.className[0]) === input.level)
      : pupilMovements;

    classMovements = aggregateMovements(filtered, (m) => m.className);
    subjectMovements = aggregateMovements(filtered, (m) => m.subjectCode);
    schoolMovement = aggregateSchool(filtered, filtered.length);
  } else {
    if (!hasUpsa && !hasUasa) {
      warnings.push("Tiada data UPSA atau UASA tersedia untuk tahun ini.");
    } else if (!hasUpsa) {
      warnings.push("Data UPSA tidak tersedia. Perbandingan peperiksaan memerlukan kedua-dua UPSA dan UASA.");
    } else {
      warnings.push("Data UASA tidak tersedia. Perbandingan peperiksaan memerlukan kedua-dua UPSA dan UASA.");
    }
  }

  // --- PBD semester movement ---
  const hasPbdSem1 = input.pbdSem1Records !== null && input.pbdSem1Records.length > 0;
  const hasPbdSem2 = input.pbdSem2Records !== null && input.pbdSem2Records.length > 0;

  let pbdMovements: ProgressModel["pbdMovements"] = [];

  if (hasPbdSem1 && hasPbdSem2) {
    pbdMovements = buildPbdSemesterMovements(input.pbdSem1Records!, input.pbdSem2Records!);
    if (input.level !== null) {
      pbdMovements = pbdMovements.filter(
        (m) => Number(m.className[0]) === input.level,
      );
    }
  } else if (!hasPbdSem1 && !hasPbdSem2) {
    warnings.push("Tiada data PBD tersedia untuk perbandingan semester.");
  } else if (!hasPbdSem1) {
    warnings.push("Data PBD Semester 1 tidak tersedia. Perbandingan PBD memerlukan kedua-dua semester.");
  } else {
    warnings.push("Data PBD Semester 2 tidak tersedia. Perbandingan PBD memerlukan kedua-dua semester.");
  }

  // --- Combined evidence rows ---
  const examByClassSubject = new Map<string, AggregateMovement>();
  for (const movement of pupilMovements) {
    const key = `${movement.className}|${movement.subjectCode}`;
    // Build per-class-subject aggregates from pupil movements
    const existing = examByClassSubject.get(key);
    if (!existing) {
      examByClassSubject.set(key, {
        label: key,
        matchedCount: 0,
        improvedCount: 0,
        stableCount: 0,
        declinedCount: 0,
        averageDelta: null,
        upsaAveragePercent: null,
        uasaAveragePercent: null,
        coverageRatio: 0,
      });
    }
  }

  // Recompute proper per-class-subject aggregates
  const classSubjectMovements = aggregateMovements(
    input.level !== null
      ? pupilMovements.filter((m) => Number(m.className[0]) === input.level)
      : pupilMovements,
    (m) => `${m.className}|${m.subjectCode}`,
  );
  const examByCS = new Map<string, AggregateMovement>();
  for (const agg of classSubjectMovements) {
    examByCS.set(agg.label, agg);
  }

  // Subject names lookup
  const subjectNames = new Map<string, string>();
  for (const movement of pupilMovements) {
    if (!subjectNames.has(movement.subjectCode)) {
      subjectNames.set(movement.subjectCode, subjectDisplayName(movement.subjectCode));
    }
  }
  for (const pbd of pbdMovements) {
    if (!subjectNames.has(pbd.subjectCode)) {
      subjectNames.set(pbd.subjectCode, subjectDisplayName(pbd.subjectCode));
    }
  }

  // Class levels lookup
  const classLevels = new Map<string, number>();
  for (const movement of pupilMovements) {
    if (!classLevels.has(movement.className)) {
      classLevels.set(movement.className, Number(movement.className[0]) || 0);
    }
  }
  for (const pbd of pbdMovements) {
    if (!classLevels.has(pbd.className)) {
      classLevels.set(pbd.className, Number(pbd.className[0]) || 0);
    }
  }

  // Enrolled and matched counts by class-subject
  const enrolledByCS = new Map<string, number>();
  const matchedByCS = new Map<string, number>();
  for (const agg of classSubjectMovements) {
    matchedByCS.set(agg.label, agg.matchedCount);
    // Approximate enrolled from coverage ratio
    if (agg.coverageRatio > 0) {
      enrolledByCS.set(agg.label, Math.round(agg.matchedCount / agg.coverageRatio));
    } else {
      enrolledByCS.set(agg.label, agg.matchedCount);
    }
  }

  const evidenceRows = buildCombinedEvidence(
    examByCS,
    pbdMovements,
    subjectNames,
    classLevels,
    enrolledByCS,
    matchedByCS,
  );

  return {
    year: input.year,
    level: input.level,
    pupilMovements: input.level !== null
      ? pupilMovements.filter((m) => Number(m.className[0]) === input.level)
      : pupilMovements,
    classMovements,
    subjectMovements,
    schoolMovement,
    pbdMovements,
    evidenceRows,
    coverage: {
      totalEnrolled,
      matchedInBoth,
      upsaOnly: upsaOnlyCount,
      uasaOnly: uasaOnlyCount,
      unmatched: unmatchedCount,
    },
    warnings,
  };
}
