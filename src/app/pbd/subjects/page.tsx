import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/auth";

export default async function PbdSubjectsPage() {
  const { defaultPbdPeriod } = await requireSchoolContext();
  redirect(defaultPbdPeriod ? `/pbd/periods/${defaultPbdPeriod.year}/subjects` : "/pbd");
}
