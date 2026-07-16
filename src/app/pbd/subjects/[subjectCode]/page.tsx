import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/auth";

export default async function PbdSubjectPage({ params }: { params: Promise<{ subjectCode: string }> }) {
  const { defaultPbdPeriod } = await requireSchoolContext();
  const { subjectCode } = await params;
  redirect(defaultPbdPeriod ? `/pbd/periods/${defaultPbdPeriod.year}/subjects/${encodeURIComponent(subjectCode)}` : "/pbd/subjects");
}
