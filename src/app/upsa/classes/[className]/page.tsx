import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/auth";
import { assessmentPath } from "@/lib/config/periods";

export default async function UpsaClassPage({ params }: { params: Promise<{ className: string }> }) {
  const { defaultUpsaPeriod } = await requireSchoolContext();
  const { className } = await params;
  redirect(assessmentPath(defaultUpsaPeriod!, `/classes/${encodeURIComponent(className)}`));
}
