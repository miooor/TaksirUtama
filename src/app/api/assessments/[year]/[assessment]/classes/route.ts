import { NextResponse } from "next/server";
import { getAssessmentApiContext } from "@/lib/assessmentApi";
import { getAllAssessmentClassResultsHybrid } from "@/lib/upsa/data";

export async function GET(_: Request, { params }: { params: Promise<{ year: string; assessment: string }> }) {
  const { context, period } = await getAssessmentApiContext(params);
  const results = await getAllAssessmentClassResultsHybrid(context, period);
  return NextResponse.json(results.map((result) => ({
    className: result.className,
    teacherName: result.teacherName,
    pupilCount: result.students.length,
  })));
}
