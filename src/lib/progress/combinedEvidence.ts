import type {
  AggregateMovement,
  CombinedEvidenceRow,
  EvidenceLabel,
  MovementDirection,
  PbdSemesterMovement,
} from "@/types/progress";

/** Coverage below this ratio marks a row as incomplete evidence. */
const COVERAGE_THRESHOLD = 0.5;

/**
 * Map an exam aggregate direction to a simple signal.
 */
function examDirection(exam: AggregateMovement | null): MovementDirection | null {
  if (!exam || exam.matchedCount === 0) return null;
  if (exam.declinedCount > exam.improvedCount && exam.averageDelta !== null && exam.averageDelta <= -5) return "declined";
  if (exam.improvedCount > exam.declinedCount && exam.averageDelta !== null && exam.averageDelta >= 5) return "improved";
  if (exam.averageDelta !== null && exam.averageDelta >= 5) return "improved";
  if (exam.averageDelta !== null && exam.averageDelta <= -5) return "declined";
  return "stable";
}

/**
 * Determine the combined evidence label for a class-subject row.
 *
 * Rules:
 * - Coverage < 50% → "incomplete"
 * - Only exam evidence available → use exam direction
 * - Only PBD evidence available → use PBD direction
 * - Both agree → use shared direction
 * - Both present but opposite → "mixed"
 * - Both stable → "stable"
 */
export function classifyEvidence(
  exam: AggregateMovement | null,
  pbd: PbdSemesterMovement | null,
  coverageRatio: number,
): EvidenceLabel {
  if (coverageRatio < COVERAGE_THRESHOLD) return "incomplete";

  const examDir = examDirection(exam);
  const pbdDir = pbd?.direction ?? null;

  // No evidence at all
  if (examDir === null && (pbdDir === null || pbdDir === "incomplete")) return "incomplete";

  // Only one signal available
  if (examDir === null) {
    if (pbdDir === "improved") return "improving";
    if (pbdDir === "declined") return "declining";
    if (pbdDir === "stable") return "stable";
    return "incomplete";
  }

  if (pbdDir === null || pbdDir === "incomplete") {
    if (examDir === "improved") return "improving";
    if (examDir === "declined") return "declining";
    if (examDir === "stable") return "stable";
    return "incomplete";
  }

  // Both signals present
  const examPositive = examDir === "improved";
  const examNegative = examDir === "declined";
  const pbdPositive = pbdDir === "improved";
  const pbdNegative = pbdDir === "declined";

  // Opposite directions → mixed evidence
  if ((examPositive && pbdNegative) || (examNegative && pbdPositive)) return "mixed";

  // Both improving
  if (examPositive && pbdPositive) return "improving";
  if (examPositive || pbdPositive) {
    // One improving, other stable
    if (!examNegative && !pbdNegative) return "improving";
  }

  // Both declining
  if (examNegative && pbdNegative) return "declining";
  if (examNegative || pbdNegative) {
    // One declining, other stable
    if (!examPositive && !pbdPositive) return "declining";
  }

  return "stable";
}

/**
 * Build combined evidence rows by merging exam aggregates and PBD movements
 * at the class-subject level.
 */
export function buildCombinedEvidence(
  examByClassSubject: Map<string, AggregateMovement>,
  pbdMovements: PbdSemesterMovement[],
  subjectNames: Map<string, string>,
  classLevels: Map<string, number>,
  enrolledByClassSubject: Map<string, number>,
  matchedByClassSubject: Map<string, number>,
): CombinedEvidenceRow[] {
  // Union of all class-subject keys
  const allKeys = new Set<string>([
    ...examByClassSubject.keys(),
    ...pbdMovements.map((p) => `${p.className}|${p.subjectCode}`),
  ]);

  const pbdIndex = new Map<string, PbdSemesterMovement>();
  for (const pbd of pbdMovements) {
    pbdIndex.set(`${pbd.className}|${pbd.subjectCode}`, pbd);
  }

  const rows: CombinedEvidenceRow[] = [];
  for (const key of allKeys) {
    const [className, subjectCode] = key.split("|") as [string, string];
    const exam = examByClassSubject.get(key) ?? null;
    const pbd = pbdIndex.get(key) ?? null;

    const totalPupilCount = enrolledByClassSubject.get(key) ?? exam?.matchedCount ?? 0;
    const matchedPupilCount = matchedByClassSubject.get(key) ?? exam?.matchedCount ?? 0;
    const coverageRatio = totalPupilCount > 0 ? matchedPupilCount / totalPupilCount : 0;

    rows.push({
      className,
      subjectCode,
      subjectName: subjectNames.get(subjectCode) ?? subjectCode,
      level: classLevels.get(className) ?? (Number(className[0]) || 0),
      exam,
      pbd,
      matchedPupilCount,
      totalPupilCount,
      coverageRatio,
      label: classifyEvidence(exam, pbd, coverageRatio),
    });
  }

  // Sort: declines first, then incomplete, then mixed, then stable, then improving
  const labelPriority: Record<EvidenceLabel, number> = {
    declining: 0,
    incomplete: 1,
    mixed: 2,
    stable: 3,
    improving: 4,
  };

  return rows.sort(
    (a, b) =>
      labelPriority[a.label] - labelPriority[b.label] ||
      a.className.localeCompare(b.className, "ms") ||
      a.subjectCode.localeCompare(b.subjectCode, "ms"),
  );
}
