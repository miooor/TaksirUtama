import { NextResponse } from "next/server";
import { getAssessmentApiContext } from "@/lib/assessmentApi";
import { calculateUpsaClassAnalysis } from "@/lib/upsa/calculateUpsaClassAnalysis";
import { getAssessmentClassResultWithRegistry } from "@/lib/upsa/data";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ year: string; assessment: string; className: string }> },
) {
  const { className } = await params;
  const { context, school, period } = await getAssessmentApiContext(params);
  const result = await getAssessmentClassResultWithRegistry(context, period, decodeURIComponent(className));
  return NextResponse.json(calculateUpsaClassAnalysis(result));
}
