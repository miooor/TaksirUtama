import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/auth";

export default async function PbdClassPage({ params }: { params: Promise<{ className: string }> }) {
  const { defaultPbdPeriod } = await requireSchoolContext();
  const { className } = await params;
  redirect(defaultPbdPeriod ? `/pbd/periods/${defaultPbdPeriod.year}/classes/${encodeURIComponent(className)}` : "/pbd/classes");
}
