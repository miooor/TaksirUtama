import { NextResponse } from "next/server";
import { getAssessmentApiContext } from "@/lib/assessmentApi";
import { getAllAssessmentClassResults } from "@/lib/upsa/data";

export async function GET(_: Request, { params }: { params: Promise<{ year: string; assessment: string }> }) {
  const { school, period } = await getAssessmentApiContext(params);
  const results = await getAllAssessmentClassResults(school, period);
  return NextResponse.json(results.map((result) => ({
    className: result.className,
    teacherName: result.teacherName,
    pupilCount: result.students.length,
  })));
}
