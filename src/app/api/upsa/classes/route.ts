import { NextResponse } from "next/server";
import { getAllAssessmentClassResultsWithRegistry } from "@/lib/upsa/data";
import { requireDefaultUpsaContext } from "@/lib/defaultDataContext";

export async function GET() {
  const { context, school, period } = await requireDefaultUpsaContext();
  const results = await getAllAssessmentClassResultsWithRegistry(context, period);
  return NextResponse.json(results.map((result) => ({
    className: result.className,
    teacherName: result.teacherName,
    pupilCount: result.students.length,
  })));
}
