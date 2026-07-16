import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/auth";
import { assessmentPath } from "@/lib/config/periods";

export default async function UpsaClassesPage() {
  const { defaultUpsaPeriod } = await requireSchoolContext();
  redirect(assessmentPath(defaultUpsaPeriod!, "/classes"));
}
