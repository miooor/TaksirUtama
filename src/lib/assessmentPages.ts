import { notFound, redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/auth";
import { createPlaceholderAssessmentPeriod, listPeriodYears } from "@/lib/config/periods";
import { resolveAssessmentPeriod } from "@/lib/config/periods";
import { isUasaDataAvailable } from "@/lib/config/uasaAvailability";

export async function getAssessmentPageContext(params: Promise<{ year: string; assessment: string }>) {
  const { year, assessment } = await params;
  const school = await requireSchoolContext();
  const period = resolveAssessmentPeriod(school.assessmentPeriods, year, assessment);
  if (period) {
    if (assessment === "uasa" && !isUasaDataAvailable(period)) {
      redirect(`/uasa?year=${year}`);
    }
    return { school, period };
  }
  if ((assessment !== "upsa" && assessment !== "uasa") || !listPeriodYears(school.assessmentPeriods, school.pbdPeriods).includes(year)) {
    notFound();
  }
  if (assessment === "uasa") {
    redirect(`/uasa?year=${year}`);
  }
  return { school, period: createPlaceholderAssessmentPeriod(year, assessment) };
}

export async function getAssessmentPagePeriod(params: Promise<{ year: string; assessment: string }>) {
  return (await getAssessmentPageContext(params)).period;
}

export function assessmentBasePath(period: { year: string; assessment: string }) {
  return `/assessments/${period.year}/${period.assessment}`;
}

export function assessmentClassPath(period: { year: string; assessment: string }, className: string) {
  return `${assessmentBasePath(period)}/classes/${encodeURIComponent(className)}`;
}

export function assessmentYearPath(period: { year: string; assessment: string }, level: string) {
  return `${assessmentBasePath(period)}/years/${encodeURIComponent(level)}`;
}

export function assessmentApiBasePath(period: { year: string; assessment: string }) {
  return `/api/assessments/${period.year}/${period.assessment}`;
}
