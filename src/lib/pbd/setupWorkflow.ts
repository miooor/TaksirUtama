import type { DatabasePbdSetup } from "@/lib/db/pbd";

export type PbdSetupView = "classes" | "pupils" | "subjects" | "assignments";

const setupViews: PbdSetupView[] = ["classes", "pupils", "subjects", "assignments"];

export function resolvePbdSetupView(requested: string | undefined, setup: DatabasePbdSetup): PbdSetupView {
  if (setupViews.includes(requested as PbdSetupView)) return requested as PbdSetupView;
  if (!setup.classes.some((item) => item.active)) return "classes";
  if (!setup.subjects.some((item) => item.active)) return "subjects";
  return "assignments";
}

export function pbdSetupCounts(setup: DatabasePbdSetup) {
  const activeClassIds = new Set(setup.classes.filter((item) => item.active).map((item) => item.id));
  const activeSubjectIds = new Set(setup.subjects.filter((item) => item.active).map((item) => item.id));
  return {
    classes: activeClassIds.size,
    subjects: activeSubjectIds.size,
    assignments: setup.rows.filter((row) => row.active && activeClassIds.has(row.classId) && activeSubjectIds.has(row.subjectId)).length,
  };
}
