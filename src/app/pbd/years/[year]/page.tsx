import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/auth";

export default async function PbdYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { defaultPbdPeriod } = await requireSchoolContext();
  const { year } = await params;
  redirect(defaultPbdPeriod ? `/pbd/periods/${defaultPbdPeriod.year}/years/${encodeURIComponent(year)}` : "/pbd/years");
}
