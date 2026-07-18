export const subjectEntryFields = ["tp1", "tp2", "tp3", "tp4", "tp5", "tp6", "notAssessed"] as const;
export type SubjectEntryField = (typeof subjectEntryFields)[number];
export type SubjectEntryValues = Record<SubjectEntryField, string>;
export type SubjectEntryFilter = "all" | "empty" | "mismatch" | "ready" | "final";

export function emptySubjectEntryValues(): SubjectEntryValues {
  return { tp1: "", tp2: "", tp3: "", tp4: "", tp5: "", tp6: "", notAssessed: "" };
}

export function subjectEntryTotal(values: SubjectEntryValues) {
  return subjectEntryFields.reduce((sum, field) => sum + (values[field] === "" ? 0 : Number(values[field])), 0);
}

export function subjectEntryComplete(values: SubjectEntryValues) {
  return subjectEntryFields.every((field) => values[field] !== "");
}

export function subjectEntryPercentage(value: string, enrolledCount: number) {
  if (value === "") return null;
  return enrolledCount > 0 ? (Number(value) / enrolledCount) * 100 : 0;
}

export function subjectEntryBalance(values: SubjectEntryValues, enrolledCount: number) {
  const difference = enrolledCount - subjectEntryTotal(values);
  if (difference > 0) return { kind: "remaining" as const, label: `Baki ${difference} murid` };
  if (difference < 0) return { kind: "over" as const, label: `Lebih ${Math.abs(difference)} murid` };
  return { kind: "complete" as const, label: "Lengkap" };
}

export function subjectEntryState(values: SubjectEntryValues, enrolledCount: number, finalized: boolean): Exclude<SubjectEntryFilter, "all"> {
  if (finalized) return "final";
  if (subjectEntryFields.every((field) => values[field] === "")) return "empty";
  return subjectEntryComplete(values) && subjectEntryTotal(values) === enrolledCount ? "ready" : "mismatch";
}

export function fillSubjectEntryBlanks(values: SubjectEntryValues) {
  return Object.fromEntries(subjectEntryFields.map((field) => [field, values[field] === "" ? "0" : values[field]])) as SubjectEntryValues;
}

export function subjectEntryRecoveryKey(schoolId: string, year: string, semester: string, subjectId: string) {
  return `pbd-subject-entry:${schoolId}:${year}:${semester}:${subjectId}`;
}

export function revisionsMatch(current: Record<string, number>, recovered: Record<string, number>) {
  const currentIds = Object.keys(current).sort();
  const recoveredIds = Object.keys(recovered).sort();
  return currentIds.length === recoveredIds.length
    && currentIds.every((id, index) => id === recoveredIds[index] && current[id] === recovered[id]);
}

export function selectSubjectForEntry(
  eligibleSubjectIds: string[],
  requestedSubjectId: string | undefined,
  legacyClassId: string | undefined,
  assignments: Array<{ classId: string; subjectId: string }>,
) {
  const eligible = new Set(eligibleSubjectIds);
  if (requestedSubjectId && eligible.has(requestedSubjectId)) return requestedSubjectId;
  if (legacyClassId) {
    const legacySubject = assignments.find((item) => item.classId === legacyClassId && eligible.has(item.subjectId));
    if (legacySubject) return legacySubject.subjectId;
  }
  return eligibleSubjectIds[0] ?? null;
}
