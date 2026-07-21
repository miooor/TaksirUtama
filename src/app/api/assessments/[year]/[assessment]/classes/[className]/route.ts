import { NextResponse } from "next/server";
import { getAssessmentApiContext } from "@/lib/assessmentApi";
import { getAssessmentClassResultWithRegistry } from "@/lib/upsa/data";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ year: string; assessment: string; className: string }> },
) {
  const { className } = await params;
  const { context, school, period } = await getAssessmentApiContext(params);
  return NextResponse.json(await getAssessmentClassResultWithRegistry(context, period, decodeURIComponent(className)));
}
