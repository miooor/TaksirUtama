import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/auth";

export default async function PbdClassesPage() {
  const { defaultPbdPeriod } = await requireSchoolContext();
  redirect(defaultPbdPeriod ? `/pbd/periods/${defaultPbdPeriod.year}/classes` : "/pbd");
}
