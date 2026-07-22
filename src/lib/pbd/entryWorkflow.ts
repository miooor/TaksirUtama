export type PbdEntryMode = "subject" | "class";

export const pbdEntryFields = ["tp1", "tp2", "tp3", "tp4", "tp5", "tp6", "notAssessed"] as const;
export type PbdEntryField = (typeof pbdEntryFields)[number];
export type PbdEntryValues = Record<PbdEntryField, string>;
export type PbdEntryFilter = "unfinished" | "all" | "empty" | "mismatch" | "ready" | "final";
export type PbdEntryRowState = Exclude<PbdEntryFilter, "all" | "unfinished">;

export function resolvePbdEntryMode(view: string | null | undefined): PbdEntryMode {
  return view === "class" ? "class" : "subject";
}

export function emptyPbdEntryValues(): PbdEntryValues {
  return { tp1: "", tp2: "", tp3: "", tp4: "", tp5: "", tp6: "", notAssessed: "" };
}

export function pbdEntryTotal(values: PbdEntryValues) {
  return pbdEntryFields.reduce((sum, field) => sum + (values[field] === "" ? 0 : Number(values[field])), 0);
}

export function pbdEntryComplete(values: PbdEntryValues) {
  return pbdEntryFields.every((field) => values[field] !== "");
}

export function pbdEntryPercentage(value: string, enrolledCount: number) {
  if (value === "") return null;
  return enrolledCount > 0 ? (Number(value) / enrolledCount) * 100 : 0;
}

export function pbdEntryBalance(values: PbdEntryValues, enrolledCount: number) {
  const difference = enrolledCount - pbdEntryTotal(values);
  if (difference > 0) return { kind: "remaining" as const, label: `Baki ${difference} murid` };
  if (difference < 0) return { kind: "over" as const, label: `Lebih ${Math.abs(difference)} murid` };
  return { kind: "complete" as const, label: "Lengkap" };
}

export function pbdEntryState(values: PbdEntryValues, enrolledCount: number, finalized: boolean): PbdEntryRowState {
  if (finalized) return "final";
  if (pbdEntryFields.every((field) => values[field] === "")) return "empty";
  return pbdEntryComplete(values) && pbdEntryTotal(values) === enrolledCount ? "ready" : "mismatch";
}

const statusLabels: Record<PbdEntryRowState, string> = {
  empty: "Belum diisi",
  mismatch: "Perlu semakan",
  ready: "Sedia dimuktamadkan",
  final: "Muktamad",
};

export function pbdEntryStatusLabel(state: PbdEntryRowState) {
  return statusLabels[state];
}

export function pbdEntryMatchesFilter(state: PbdEntryRowState, filter: PbdEntryFilter) {
  if (filter === "all") return true;
  if (filter === "unfinished") return state !== "final";
  return state === filter;
}

export function fillPbdEntryBlanks(values: PbdEntryValues) {
  return Object.fromEntries(pbdEntryFields.map((field) => [field, values[field] === "" ? "0" : values[field]])) as PbdEntryValues;
}

export function pbdEntryRecoveryKey(schoolId: string, year: string, semester: string, mode: PbdEntryMode, selectionId: string) {
  return `pbd-entry:${schoolId}:${year}:${semester}:${mode}:${selectionId}`;
}

export function pbdSemesterSwitchMessage(currentSemester: string, nextSemester: string) {
  return `Perubahan Semester ${currentSemester} belum disimpan. Tukar ke Semester ${nextSemester}?`;
}

export function pbdModeSwitchMessage(mode: PbdEntryMode) {
  return `Perubahan belum disimpan. Tukar ke paparan ${mode === "class" ? "mengikut kelas" : "mengikut subjek"} tanpa menyimpan?`;
}

export function pbdEntrySaveFeedback(mode: PbdEntryMode, changedCount: number, semester: string, savedAt?: string) {
  if (changedCount === 0) return `Tiada perubahan baharu untuk Semester ${semester}.`;
  const unit = mode === "class" ? "subjek" : "kelas";
  return `${changedCount} ${unit} disimpan untuk Semester ${semester} pada ${savedAt}.`;
}

export function pbdEntryHref(input: { year: string; semester: string; mode: PbdEntryMode; selectionId?: string | null }) {
  const params = new URLSearchParams({ year: input.year, semester: input.semester, view: input.mode });
  if (input.selectionId) params.set(input.mode === "class" ? "classId" : "subjectId", input.selectionId);
  return `/pbd/entry?${params.toString()}`;
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

export function selectClassForEntry(
  eligibleClassIds: string[],
  requestedClassId: string | undefined,
  legacySubjectId: string | undefined,
  assignments: Array<{ classId: string; subjectId: string }>,
) {
  const eligible = new Set(eligibleClassIds);
  if (requestedClassId && eligible.has(requestedClassId)) return requestedClassId;
  if (legacySubjectId) {
    const legacyClass = assignments.find((item) => item.subjectId === legacySubjectId && eligible.has(item.classId));
    if (legacyClass) return legacyClass.classId;
  }
  return eligibleClassIds[0] ?? null;
}

const classLevelOrder: Record<string, number> = { tahun: 0, peralihan: 1, tingkatan: 2 };

export function sortClassesForEntry<T extends { id: string; name: string; levelKind: string; levelNumber: number | null }>(classes: T[]): T[] {
  return [...classes].sort((a, b) =>
    (classLevelOrder[a.levelKind] ?? 3) - (classLevelOrder[b.levelKind] ?? 3)
    || (a.levelNumber ?? 0) - (b.levelNumber ?? 0)
    || a.name.localeCompare(b.name, "ms"),
  );
}

export type EntryPasteGrid = string[][];
export type EntryPasteResult = { ok: true; grid: EntryPasteGrid } | { ok: false; reason: "empty" | "columns" | "values" };

const pasteCellPattern = /^\d+$/;

/**
 * Parses tab/newline clipboard text from Excel or Google Sheets into a
 * validated grid of pupil counts. Empty cells are preserved as "" so the
 * caller can leave existing values untouched. The whole paste is rejected
 * when any non-empty cell is not a non-negative integer or when a row is
 * wider than the TP columns, so malformed data is never partially applied.
 */
export function parseEntryPaste(text: string): EntryPasteResult {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  if (lines.length === 0) return { ok: false, reason: "empty" };
  const grid: EntryPasteGrid = [];
  for (const line of lines) {
    const cells = line.split("\t");
    if (cells.length > pbdEntryFields.length) return { ok: false, reason: "columns" };
    grid.push(cells.map((cell) => cell.trim()));
  }
  for (const row of grid) {
    for (const cell of row) {
      if (cell !== "" && !pasteCellPattern.test(cell)) return { ok: false, reason: "values" };
    }
  }
  return { ok: true, grid };
}

export const entryPasteErrorMessages: Record<"empty" | "columns" | "values" | "rows", string> = {
  empty: "Data tampalan kosong.",
  columns: "Data tampalan melebihi bilangan lajur TP.",
  values: "Data tampalan mengandungi nilai tidak sah. Gunakan nombor bulat sahaja.",
  rows: "Data tampalan melebihi bilangan baris yang boleh diedit.",
};
