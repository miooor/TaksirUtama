import { NextResponse } from "next/server";
import { getAllAssessmentClassResults } from "@/lib/upsa/data";
import { requireDefaultUpsaContext } from "@/lib/defaultDataContext";

export async function GET() {
  const { school, period } = await requireDefaultUpsaContext();
  const results = await getAllAssessmentClassResults(school, period);
  return NextResponse.json(results.map((result) => ({
    className: result.className,
    teacherName: result.teacherName,
    pupilCount: result.students.length,
  })));
}
