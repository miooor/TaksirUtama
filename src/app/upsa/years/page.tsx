import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/auth";
import { assessmentPath } from "@/lib/config/periods";

export default async function UpsaYearsPage() {
  const { defaultUpsaPeriod } = await requireSchoolContext();
  redirect(assessmentPath(defaultUpsaPeriod!, "/years"));
}
