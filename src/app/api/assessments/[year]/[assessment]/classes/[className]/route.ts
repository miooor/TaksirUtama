import { NextResponse } from "next/server";
import { getAssessmentApiContext } from "@/lib/assessmentApi";
import { getAssessmentClassResult } from "@/lib/upsa/data";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ year: string; assessment: string; className: string }> },
) {
  const { className } = await params;
  const { school, period } = await getAssessmentApiContext(params);
  return NextResponse.json(await getAssessmentClassResult(school, period, decodeURIComponent(className)));
}
