import { notFound, redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/auth";
import { assessmentModuleDestination } from "@/lib/assessmentRoutes";

export default async function AssessmentModuleLandingPage({ params }: { params: Promise<{ year: string; assessment: string }> }) {
  const { year, assessment } = await params;
  const school = await requireSchoolContext();
  const { assessmentPeriods, pbdPeriods } = school;
  const destination = assessmentModuleDestination({ year, assessment, assessmentPeriods, pbdPeriods });
  if (!destination) {
    notFound();
  }
  redirect(destination);
}
