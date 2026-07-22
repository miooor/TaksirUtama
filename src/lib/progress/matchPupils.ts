import { normalizeSubjectCode } from "@/lib/subjects";

/**
 * Minimal assessment result shape consumed by the matching engine.
 * Decoupled from the full UpsaStudentResult to keep the engine testable.
 */
export type AssessmentResultEntry = {
  studentId: string | null;
  displayName: string;
  className: string;
  subjectCode: string;
  mark: number | null;
  maxMark: number;
  status: "marked" | "missing" | "absent";
};

export type MatchedPair = {
  studentId: string;
  displayName: string;
  className: string;
  previousClassName?: string;
  subjectCode: string;
  upsa: AssessmentResultEntry;
  uasa: AssessmentResultEntry;
};

export type MatchResult = {
  matched: MatchedPair[];
  upsaOnly: AssessmentResultEntry[];
  uasaOnly: AssessmentResultEntry[];
  unmatched: AssessmentResultEntry[];
};

/**
 * Flatten class results into individual subject entries.
 * Only entries with a non-null studentId can participate in matching.
 */
export function flattenResults(
  classResults: Array<{
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
  }>,
): AssessmentResultEntry[] {
  const entries: AssessmentResultEntry[] = [];
  for (const classResult of classResults) {
    for (const student of classResult.students) {
      for (const subject of student.subjects) {
        entries.push({
          studentId: student.studentId,
          displayName: student.name,
          className: student.className || classResult.className,
          subjectCode: normalizeSubjectCode(subject.subjectCode),
          mark: subject.mark,
          maxMark: subject.maxMark,
          status: subject.status,
        });
      }
    }
  }
  return entries;
}

/**
 * Match UPSA and UASA results by stable studentId + canonicalized subjectCode.
 *
 * Rules:
 * - Only entries with status "marked" participate in movement calculations.
 * - Entries without a studentId are classified as unmatched.
 * - Pupils changing classes remain matched by studentId; both class names are preserved.
 * - Missing/absent entries are kept visible as coverage issues, not zero marks.
 */
export function matchPupils(
  upsaEntries: AssessmentResultEntry[],
  uasaEntries: AssessmentResultEntry[],
): MatchResult {
  // Index UASA entries by studentId + subjectCode
  const uasaIndex = new Map<string, AssessmentResultEntry>();
  const uasaUnmatched: AssessmentResultEntry[] = [];

  for (const entry of uasaEntries) {
    if (!entry.studentId) {
      uasaUnmatched.push(entry);
      continue;
    }
    const key = `${entry.studentId}|${entry.subjectCode}`;
    uasaIndex.set(key, entry);
  }

  const matched: MatchedPair[] = [];
  const upsaOnly: AssessmentResultEntry[] = [];
  const unmatched: AssessmentResultEntry[] = [...uasaUnmatched];
  const consumedUasaKeys = new Set<string>();

  for (const upsa of upsaEntries) {
    if (!upsa.studentId) {
      unmatched.push(upsa);
      continue;
    }

    const key = `${upsa.studentId}|${upsa.subjectCode}`;
    const uasa = uasaIndex.get(key);

    if (uasa) {
      consumedUasaKeys.add(key);
      const classChanged = upsa.className !== uasa.className;
      matched.push({
        studentId: upsa.studentId,
        displayName: uasa.displayName || upsa.displayName,
        className: uasa.className,
        previousClassName: classChanged ? upsa.className : undefined,
        subjectCode: upsa.subjectCode,
        upsa,
        uasa,
      });
    } else {
      upsaOnly.push(upsa);
    }
  }

  // UASA entries not consumed by any UPSA match
  const uasaOnly: AssessmentResultEntry[] = [];
  for (const entry of uasaEntries) {
    if (!entry.studentId) continue; // already in unmatched
    const key = `${entry.studentId}|${entry.subjectCode}`;
    if (!consumedUasaKeys.has(key)) {
      uasaOnly.push(entry);
    }
  }

  return { matched, upsaOnly, uasaOnly, unmatched };
}
