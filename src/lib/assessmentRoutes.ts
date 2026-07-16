import type { AssessmentPeriod, PbdPeriod } from "@/lib/config/periods";
import { isUasaDataAvailable } from "@/lib/config/uasaAvailability";

export function correctedAssessmentPath(path: string[] | undefined) {
  const suffix = path?.length ? `/${path.map((segment) => encodeURIComponent(segment)).join("/")}` : "";
  return `/assessments${suffix}`;
}

export function yearExists(year: string, assessmentPeriods: AssessmentPeriod[], pbdPeriods: PbdPeriod[]) {
  return [...assessmentPeriods, ...pbdPeriods].some((period) => period.enabled && period.year === year);
}

export function assessmentModuleDestination({
  year,
  assessment,
  assessmentPeriods,
  pbdPeriods,
  now = new Date(),
}: {
  year: string;
  assessment: string;
  assessmentPeriods: AssessmentPeriod[];
  pbdPeriods: PbdPeriod[];
  now?: Date;
}) {
  if (!yearExists(year, assessmentPeriods, pbdPeriods)) return null;
  if (assessment === "upsa") return `/assessments/${year}/upsa/classes`;
  if (assessment === "uasa") {
    const period = assessmentPeriods.find((item) => item.enabled && item.year === year && item.assessment === "uasa") ?? null;
    return isUasaDataAvailable(period, now) ? `/assessments/${year}/uasa/classes` : `/uasa?year=${year}`;
  }
  return null;
}
