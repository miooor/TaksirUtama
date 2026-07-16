import { notFound } from "next/navigation";
import { requireSchoolContext } from "@/lib/auth";
import { resolveAssessmentPeriod } from "@/lib/config/periods";

export async function getAssessmentApiContext(params: Promise<{ year: string; assessment: string }>) {
  const { year, assessment } = await params;
  const school = await requireSchoolContext();
  const period = resolveAssessmentPeriod(school.assessmentPeriods, year, assessment);
  if (!period) {
    notFound();
  }
  return { school, period };
}

export async function getAssessmentApiPeriod(params: Promise<{ year: string; assessment: string }>) {
  return (await getAssessmentApiContext(params)).period;
}

export function reportAssessmentName(period: { assessment: string; year: string }) {
  return `${period.assessment.toUpperCase()} ${period.year}`;
}
