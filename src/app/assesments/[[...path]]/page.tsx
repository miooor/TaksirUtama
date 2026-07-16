import { redirect } from "next/navigation";
import { correctedAssessmentPath } from "@/lib/assessmentRoutes";

export default async function MisspelledAssessmentsPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  redirect(correctedAssessmentPath(path));
}
