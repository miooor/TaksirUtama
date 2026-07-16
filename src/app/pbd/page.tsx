import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/auth";

export default async function PbdHomePage() {
  const { defaultPbdPeriod } = await requireSchoolContext();
  redirect(defaultPbdPeriod ? `/pbd/periods/${defaultPbdPeriod.year}` : "/dashboard");
}
