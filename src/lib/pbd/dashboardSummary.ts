import type { DatabasePbdSetup } from "@/lib/db/pbd";
import type { PbdPeriod } from "@/lib/config/periods";

export type DashboardPbdState = "empty" | "mismatch" | "ready" | "final";

export type DashboardSubjectSummary = {
  id: string;
  code: string;
  name: string;
  assignments: number;
  empty: number;
  mismatch: number;
  ready: number;
  final: number;
};

export type DashboardClassSummary = {
  id: string;
  name: string;
  assignments: number;
  empty: number;
  mismatch: number;
  ready: number;
  final: number;
};

export type DashboardPbdSummary = {
  activeClasses: number;
  activeSubjects: number;
  assignments: number;
  pupils: number;
  empty: number;
  mismatch: number;
  ready: number;
  final: number;
  finalizedPercentage: number;
  subjectsNeedingAction: DashboardSubjectSummary[];
  classesNeedingAction: DashboardClassSummary[];
};

export function resolveDashboardSelection(input: {
  availableYears: string[];
  pbdPeriods: PbdPeriod[];
  requestedYear?: string;
  requestedSemester?: string;
  defaultPbdYear?: string;
  defaultAssessmentYear?: string;
}) {
  const year = input.requestedYear && input.availableYears.includes(input.requestedYear)
    ? input.requestedYear
    : input.defaultPbdYear ?? input.defaultAssessmentYear ?? input.availableYears[0] ?? "2026";
  const configuredPeriod = input.pbdPeriods.find((period) => period.enabled && period.default && period.year === year)
    ?? input.pbdPeriods.find((period) => period.enabled && period.year === year);
  const semester: "1" | "2" = input.requestedSemester === "1" || input.requestedSemester === "2"
    ? input.requestedSemester
    : configuredPeriod?.semester ?? "1";
  return { year, semester };
}

const entryValues = (row: DatabasePbdSetup["rows"][number]) => {
  if (!row.entry) return [];
  return [
    row.entry.counts.TP1,
    row.entry.counts.TP2,
    row.entry.counts.TP3,
    row.entry.counts.TP4,
    row.entry.counts.TP5,
    row.entry.counts.TP6,
    row.entry.notAssessedCount,
  ];
};

export function classifyDashboardPbdRow(row: DatabasePbdSetup["rows"][number]): DashboardPbdState {
  if (row.entry?.status === "final") return "final";
  const values = entryValues(row);
  if (!row.entry || values.every((value) => value === null)) return "empty";
  const complete = values.every((value) => value !== null);
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return complete && total === row.enrolledCount ? "ready" : "mismatch";
}

export function summarizeDashboardPbd(setup: DatabasePbdSetup): DashboardPbdSummary {
  const activeClasses = setup.classes.filter((item) => item.active);
  const activeSubjects = setup.subjects.filter((item) => item.active);
  const classIds = new Set(activeClasses.map((item) => item.id));
  const subjectIds = new Set(activeSubjects.map((item) => item.id));
  const rows = setup.rows.filter((row) => row.active && classIds.has(row.classId) && subjectIds.has(row.subjectId));
  const totals = { empty: 0, mismatch: 0, ready: 0, final: 0 };
  const subjects = new Map<string, DashboardSubjectSummary>();
  const classes = new Map<string, DashboardClassSummary>();

  for (const row of rows) {
    const state = classifyDashboardPbdRow(row);
    totals[state] += 1;
    const subject = subjects.get(row.subjectId) ?? {
      id: row.subjectId,
      code: row.subjectCode,
      name: row.subjectName,
      assignments: 0,
      empty: 0,
      mismatch: 0,
      ready: 0,
      final: 0,
    };
    subject.assignments += 1;
    subject[state] += 1;
    subjects.set(row.subjectId, subject);
    const klass = classes.get(row.classId) ?? {
      id: row.classId,
      name: row.className,
      assignments: 0,
      empty: 0,
      mismatch: 0,
      ready: 0,
      final: 0,
    };
    klass.assignments += 1;
    klass[state] += 1;
    classes.set(row.classId, klass);
  }

  const byPriority = <T extends { mismatch: number; ready: number; empty: number }>(a: T, b: T) =>
    b.mismatch - a.mismatch ||
    b.ready - a.ready ||
    b.empty - a.empty;

  const subjectsNeedingAction = [...subjects.values()]
    .filter((subject) => subject.empty + subject.mismatch + subject.ready > 0)
    .sort((a, b) => byPriority(a, b) || a.code.localeCompare(b.code, "ms"));

  const classesNeedingAction = [...classes.values()]
    .filter((klass) => klass.empty + klass.mismatch + klass.ready > 0)
    .sort((a, b) => byPriority(a, b) || a.name.localeCompare(b.name, "ms"));

  return {
    activeClasses: activeClasses.length,
    activeSubjects: activeSubjects.length,
    assignments: rows.length,
    pupils: rows.reduce((sum, row) => sum + (row.entry?.status === "final" ? row.entry.enrolledCount : row.enrolledCount), 0),
    ...totals,
    finalizedPercentage: rows.length === 0 ? 0 : (totals.final / rows.length) * 100,
    subjectsNeedingAction,
    classesNeedingAction,
  };
}
