import { notFound } from "next/navigation";
import { requireActorContext } from "@/lib/auth/actor";
import { resolveAssessmentPeriod } from "@/lib/config/periods";

export async function getAssessmentApiContext(params: Promise<{ year: string; assessment: string }>) {
  const { year, assessment } = await params;
  const context = await requireActorContext();
  const period = resolveAssessmentPeriod(context.school.assessmentPeriods, year, assessment);
  if (!period) {
    notFound();
  }
  return { context, school: context.school, period };
}

export async function getAssessmentApiPeriod(params: Promise<{ year: string; assessment: string }>) {
  return (await getAssessmentApiContext(params)).period;
}

export function reportAssessmentName(period: { assessment: string; year: string }) {
  return `${period.assessment.toUpperCase()} ${period.year}`;
}
