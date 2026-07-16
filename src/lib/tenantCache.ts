import type { SchoolContext } from "@/lib/config/schools";
import type { AssessmentPeriod, PbdPeriod } from "@/lib/config/periods";

export function assessmentCacheIdentity(school: SchoolContext, period: AssessmentPeriod) {
  return [school.id, period.year, period.assessment, period.spreadsheetId] as const;
}

export function pbdCacheIdentity(school: SchoolContext, period: PbdPeriod) {
  return [school.id, period.year, period.spreadsheetId] as const;
}
