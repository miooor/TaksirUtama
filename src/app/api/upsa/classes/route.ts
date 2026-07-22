import { NextResponse } from "next/server";
import { getAllAssessmentClassResultsHybrid } from "@/lib/upsa/data";
import { requireDefaultUpsaContext } from "@/lib/defaultDataContext";

export async function GET() {
  const { context, period } = await requireDefaultUpsaContext();
  const results = await getAllAssessmentClassResultsHybrid(context, period);
  return NextResponse.json(results.map((result) => ({
    className: result.className,
    teacherName: result.teacherName,
    pupilCount: result.students.length,
  })));
}
