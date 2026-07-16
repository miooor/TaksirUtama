import { NextResponse } from "next/server";
import { getAssessmentApiContext } from "@/lib/assessmentApi";
import { calculateUpsaClassAnalysis } from "@/lib/upsa/calculateUpsaClassAnalysis";
import { getAssessmentClassResult } from "@/lib/upsa/data";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ year: string; assessment: string; className: string }> },
) {
  const { className } = await params;
  const { school, period } = await getAssessmentApiContext(params);
  const result = await getAssessmentClassResult(school, period, decodeURIComponent(className));
  return NextResponse.json(calculateUpsaClassAnalysis(result));
}
