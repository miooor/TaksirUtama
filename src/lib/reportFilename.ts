import type { SchoolPublicProfile } from "@/lib/config/schools";
import { requireSchoolContext } from "@/lib/auth";

function safeFilenamePart(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\r\n]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function schoolReportFilename(
  school: Pick<SchoolPublicProfile, "code">,
  filename: string,
) {
  return `${safeFilenamePart(school.code)} - ${safeFilenamePart(filename)}`;
}

export async function currentSchoolReportFilename(filename: string) {
  return schoolReportFilename(await requireSchoolContext(), filename);
}
