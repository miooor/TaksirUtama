import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/auth";
import { assessmentPath } from "@/lib/config/periods";

export default async function UpsaYearAnalysisPage({ params }: { params: Promise<{ year: string }> }) {
  const { defaultUpsaPeriod } = await requireSchoolContext();
  const { year } = await params;
  redirect(assessmentPath(defaultUpsaPeriod!, `/years/${encodeURIComponent(year)}`));
}
