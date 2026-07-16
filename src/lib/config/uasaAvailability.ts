import type { AssessmentPeriod } from "@/lib/config/periods";

export function isUasaDataAvailable(period: AssessmentPeriod | null, now = new Date()) {
  if (!period?.spreadsheetId) return false;
  return !period.availableFrom || now >= new Date(period.availableFrom);
}
