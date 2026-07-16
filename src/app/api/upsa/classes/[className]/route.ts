import { NextResponse } from "next/server";
import { getAssessmentClassResult } from "@/lib/upsa/data";
import { requireDefaultUpsaContext } from "@/lib/defaultDataContext";

export async function GET(_: Request, { params }: { params: Promise<{ className: string }> }) {
  const { className } = await params;
  const { school, period } = await requireDefaultUpsaContext();
  return NextResponse.json(await getAssessmentClassResult(school, period, decodeURIComponent(className)));
}
