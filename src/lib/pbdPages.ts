import { notFound } from "next/navigation";
import { requireSchoolContext } from "@/lib/auth";
import { createPlaceholderPbdPeriod, listPeriodYears } from "@/lib/config/periods";
import { resolvePbdPeriod } from "@/lib/config/periods";

export async function getPbdPageContext(params: Promise<{ year: string }>) {
  const { year } = await params;
  const school = await requireSchoolContext();
  const period = resolvePbdPeriod(school.pbdPeriods, year);
  if (period) {
    return { school, period };
  }
  if (!listPeriodYears(school.assessmentPeriods, school.pbdPeriods).includes(year)) {
    notFound();
  }
  return { school, period: createPlaceholderPbdPeriod(year) };
}

export async function getPbdPagePeriod(params: Promise<{ year: string }>) {
  return (await getPbdPageContext(params)).period;
}

export function pbdBasePath(period: { year: string }) {
  return `/pbd/periods/${period.year}`;
}

export function pbdApiBasePath(period: { year: string }) {
  return `/api/pbd/periods/${period.year}`;
}
