import { notFound } from "next/navigation";
import { requireSchoolContext } from "@/lib/auth";
import { createPlaceholderPbdPeriod, listPeriodYears } from "@/lib/config/periods";
import { resolvePbdPeriod } from "@/lib/config/periods";
import { resolvePbdSemester } from "@/lib/pbd/semester";

export { pbdSemesterFromRequest, pbdSemesterHref, resolvePbdSemester } from "@/lib/pbd/semester";
export type { PbdSemester } from "@/lib/pbd/semester";

export async function getPbdPageContext(params: Promise<{ year: string }>, requestedSemester?: string | null) {
  const { year } = await params;
  const school = await requireSchoolContext();
  const configuredPeriod = resolvePbdPeriod(school.pbdPeriods, year);
  if (configuredPeriod) {
    const semester = resolvePbdSemester(requestedSemester, configuredPeriod.semester);
    return { school, period: { ...configuredPeriod, semester }, semester };
  }
  if (!listPeriodYears(school.assessmentPeriods, school.pbdPeriods).includes(year)) {
    notFound();
  }
  const placeholder = createPlaceholderPbdPeriod(year);
  const semester = resolvePbdSemester(requestedSemester, placeholder.semester);
  return { school, period: { ...placeholder, semester }, semester };
}

export async function getPbdPagePeriod(params: Promise<{ year: string }>, requestedSemester?: string | null) {
  return (await getPbdPageContext(params, requestedSemester)).period;
}

export function pbdBasePath(period: { year: string }) {
  return `/pbd/periods/${period.year}`;
}

export function pbdApiBasePath(period: { year: string }) {
  return `/api/pbd/periods/${period.year}`;
}
