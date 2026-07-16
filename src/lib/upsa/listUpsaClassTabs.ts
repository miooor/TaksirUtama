import { hasGoogleCredentials } from "@/lib/config/env";
import type { SchoolContext } from "@/lib/config/schools";
import type { AssessmentPeriod } from "@/lib/config/periods";
import { getSpreadsheetMetadata } from "@/lib/googleSheets/getSpreadsheetMetadata";
import { getPublicWorkbookSheetNames } from "@/lib/googleSheets/publicWorkbook";

const validClassPattern = /^[1-6](?:\s+|[-])(?=.*[\p{L}\p{N}])[\p{L}\p{N} .'-]+$/iu;

export async function listAssessmentClassTabs(_school: SchoolContext, period: AssessmentPeriod) {
  if (!period.spreadsheetId) {
    return [];
  }
  const sheetNames =
    (hasGoogleCredentials
      ? await getSpreadsheetMetadata(period.spreadsheetId)
      : process.env.NODE_ENV !== "production"
        ? await getPublicWorkbookSheetNames(period.spreadsheetId)
        : null) ?? [];

  return sheetNames.filter((sheetName) => validClassPattern.test(sheetName)).sort((a, b) => a.localeCompare(b, "ms"));
}
