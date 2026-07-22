import type { AggregateMovement, PupilMovement } from "@/types/progress";

/**
 * Aggregate pupil movements by a grouping key (class, subject, or whole school).
 * Only movements with a numeric delta (i.e. both assessments marked) count
 * toward improved/stable/declined. Incomplete movements affect coverage only.
 */
export function aggregateMovements(
  movements: PupilMovement[],
  keyFn: (m: PupilMovement) => string,
  totalEnrolledByKey?: Map<string, number>,
): AggregateMovement[] {
  const groups = new Map<string, PupilMovement[]>();
  for (const movement of movements) {
    const key = keyFn(movement);
    const existing = groups.get(key);
    if (existing) {
      existing.push(movement);
    } else {
      groups.set(key, [movement]);
    }
  }

  const results: AggregateMovement[] = [];
  for (const [label, group] of groups) {
    const withDelta = group.filter((m) => m.delta !== null);
    const improvedCount = withDelta.filter((m) => m.direction === "improved").length;
    const stableCount = withDelta.filter((m) => m.direction === "stable").length;
    const declinedCount = withDelta.filter((m) => m.direction === "declined").length;

    const averageDelta = withDelta.length
      ? withDelta.reduce((sum, m) => sum + m.delta!, 0) / withDelta.length
      : null;

    const upsaPercents = group.filter((m) => m.upsaPercent !== null);
    const uasaPercents = group.filter((m) => m.uasaPercent !== null);

    const upsaAveragePercent = upsaPercents.length
      ? upsaPercents.reduce((sum, m) => sum + m.upsaPercent!, 0) / upsaPercents.length
      : null;

    const uasaAveragePercent = uasaPercents.length
      ? uasaPercents.reduce((sum, m) => sum + m.uasaPercent!, 0) / uasaPercents.length
      : null;

    const totalEnrolled = totalEnrolledByKey?.get(label) ?? group.length;
    const coverageRatio = totalEnrolled > 0 ? withDelta.length / totalEnrolled : 0;

    results.push({
      label,
      matchedCount: withDelta.length,
      improvedCount,
      stableCount,
      declinedCount,
      averageDelta,
      upsaAveragePercent,
      uasaAveragePercent,
      coverageRatio,
    });
  }

  return results.sort((a, b) => a.label.localeCompare(b.label, "ms"));
}

/**
 * Compute a single school-wide aggregate from all pupil movements.
 */
export function aggregateSchool(
  movements: PupilMovement[],
  totalEnrolled: number,
): AggregateMovement | null {
  if (movements.length === 0) return null;

  const withDelta = movements.filter((m) => m.delta !== null);
  const improvedCount = withDelta.filter((m) => m.direction === "improved").length;
  const stableCount = withDelta.filter((m) => m.direction === "stable").length;
  const declinedCount = withDelta.filter((m) => m.direction === "declined").length;

  const averageDelta = withDelta.length
    ? withDelta.reduce((sum, m) => sum + m.delta!, 0) / withDelta.length
    : null;

  const upsaPercents = movements.filter((m) => m.upsaPercent !== null);
  const uasaPercents = movements.filter((m) => m.uasaPercent !== null);

  return {
    label: "school",
    matchedCount: withDelta.length,
    improvedCount,
    stableCount,
    declinedCount,
    averageDelta,
    upsaAveragePercent: upsaPercents.length
      ? upsaPercents.reduce((sum, m) => sum + m.upsaPercent!, 0) / upsaPercents.length
      : null,
    uasaAveragePercent: uasaPercents.length
      ? uasaPercents.reduce((sum, m) => sum + m.uasaPercent!, 0) / uasaPercents.length
      : null,
    coverageRatio: totalEnrolled > 0 ? withDelta.length / totalEnrolled : 0,
  };
}
