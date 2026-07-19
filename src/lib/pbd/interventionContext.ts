import { createPlaceholderPbdPeriod, resolvePbdPeriod, type PbdPeriod } from "@/lib/config/periods";
import type { SchoolContext } from "@/lib/config/schools";
import { resolvePbdSemester, type PbdSemester } from "@/lib/pbd/semester";

export type InterventionQueryContext = {
  year: string;
  semester: PbdSemester;
  level: number | null;
  period: PbdPeriod;
};

export function resolveInterventionQueryContext(
  school: SchoolContext,
  query: { year?: string | null; semester?: string | null; level?: string | null },
): InterventionQueryContext {
  const legacyLevel = query.year && /^[1-6]$/.test(query.year) ? Number(query.year) : null;
  const explicitLevel = query.level && /^[1-6]$/.test(query.level) ? Number(query.level) : null;
  const year = query.year && /^\d{4}$/.test(query.year)
    ? query.year
    : school.defaultPbdPeriod?.year ?? school.pbdPeriods[0]?.year ?? "2026";
  const configured = resolvePbdPeriod(school.pbdPeriods, year);
  const base = configured ?? createPlaceholderPbdPeriod(year);
  const semester = resolvePbdSemester(query.semester, base.semester ?? school.defaultPbdPeriod?.semester);
  return { year, semester, level: explicitLevel ?? legacyLevel, period: { ...base, semester } };
}
