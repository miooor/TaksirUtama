import { NextResponse } from "next/server";
import { getAssessmentApiContext } from "@/lib/assessmentApi";
import { getAssessmentClassResultHybrid } from "@/lib/upsa/data";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ year: string; assessment: string; className: string }> },
) {
  const { className } = await params;
  const { context, period } = await getAssessmentApiContext(params);
  return NextResponse.json(await getAssessmentClassResultHybrid(context, period, decodeURIComponent(className)));
}
