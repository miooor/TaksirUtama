import type { MovementDirection, PbdSemesterMovement, TpDistribution } from "@/types/progress";
import { MOVEMENT_THRESHOLD } from "./normalize";

/**
 * Minimal PBD record shape consumed by the semester comparison.
 * Mirrors PbdSubjectClassRecord fields needed for distribution comparison.
 */
export type PbdRecordInput = {
  className: string;
  subjectCode: string;
  tpCounts: { TP1: number; TP2: number; TP3: number; TP4: number; TP5: number; TP6: number };
  totalPupils: number;
  notAssessedCount: number;
};

/**
 * Convert a PBD record into a TP distribution with percentage shares.
 * low = TP1+TP2 %, mid = TP3+TP4 %, high = TP5+TP6 %.
 */
export function toDistribution(record: PbdRecordInput): TpDistribution {
  const { tpCounts, totalPupils, notAssessedCount } = record;
  const assessed = totalPupils - notAssessedCount;
  const denominator = assessed > 0 ? assessed : 1;

  const lowCount = tpCounts.TP1 + tpCounts.TP2;
  const midCount = tpCounts.TP3 + tpCounts.TP4;
  const highCount = tpCounts.TP5 + tpCounts.TP6;

  return {
    low: (lowCount / denominator) * 100,
    mid: (midCount / denominator) * 100,
    high: (highCount / denominator) * 100,
    notAssessed: notAssessedCount,
    total: totalPupils,
  };
}

/**
 * Classify PBD movement direction.
 * Improvement = low-mastery share decreased OR high-mastery share increased
 * beyond the threshold. Uses highDelta as the primary signal:
 * - highDelta >= +5 → improved
 * - highDelta <= -5 → declined
 * - otherwise stable
 * Falls back to lowDelta (inverted) when highDelta is inconclusive.
 */
export function classifyPbdDirection(
  lowDelta: number | null,
  highDelta: number | null,
): MovementDirection {
  if (lowDelta === null || highDelta === null) return "incomplete";

  if (highDelta >= MOVEMENT_THRESHOLD) return "improved";
  if (highDelta <= -MOVEMENT_THRESHOLD) return "declined";

  // Secondary signal: reduction in low mastery
  if (lowDelta <= -MOVEMENT_THRESHOLD) return "improved";
  if (lowDelta >= MOVEMENT_THRESHOLD) return "declined";

  return "stable";
}

/**
 * Compare PBD TP distributions between semester 1 and semester 2
 * at the class-subject level.
 */
export function buildPbdSemesterMovements(
  sem1Records: PbdRecordInput[],
  sem2Records: PbdRecordInput[],
): PbdSemesterMovement[] {
  // Index by className + subjectCode
  const sem1Index = new Map<string, PbdRecordInput>();
  for (const record of sem1Records) {
    sem1Index.set(`${record.className}|${record.subjectCode}`, record);
  }

  const sem2Index = new Map<string, PbdRecordInput>();
  for (const record of sem2Records) {
    sem2Index.set(`${record.className}|${record.subjectCode}`, record);
  }

  // Union of all class-subject keys
  const allKeys = new Set([...sem1Index.keys(), ...sem2Index.keys()]);
  const results: PbdSemesterMovement[] = [];

  for (const key of allKeys) {
    const [className, subjectCode] = key.split("|") as [string, string];
    const s1 = sem1Index.get(key);
    const s2 = sem2Index.get(key);

    const sem1Dist = s1 ? toDistribution(s1) : null;
    const sem2Dist = s2 ? toDistribution(s2) : null;

    const lowDelta =
      sem1Dist && sem2Dist ? sem2Dist.low - sem1Dist.low : null;
    const highDelta =
      sem1Dist && sem2Dist ? sem2Dist.high - sem1Dist.high : null;

    results.push({
      className,
      subjectCode,
      sem1: sem1Dist,
      sem2: sem2Dist,
      lowDelta,
      highDelta,
      direction: classifyPbdDirection(lowDelta, highDelta),
    });
  }

  return results.sort(
    (a, b) =>
      a.className.localeCompare(b.className, "ms") ||
      a.subjectCode.localeCompare(b.subjectCode, "ms"),
  );
}
