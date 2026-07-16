import { NextResponse } from "next/server";
import { calculateUpsaClassAnalysis } from "@/lib/upsa/calculateUpsaClassAnalysis";
import { getAssessmentClassResult } from "@/lib/upsa/data";
import { requireDefaultUpsaContext } from "@/lib/defaultDataContext";

export async function GET(_: Request, { params }: { params: Promise<{ className: string }> }) {
  const { className } = await params;
  const { school, period } = await requireDefaultUpsaContext();
  const result = await getAssessmentClassResult(school, period, decodeURIComponent(className));
  return NextResponse.json(calculateUpsaClassAnalysis(result));
}
