import { NextResponse } from "next/server";
import { getAssessmentClassResultHybrid } from "@/lib/upsa/data";
import { requireDefaultUpsaContext } from "@/lib/defaultDataContext";

export async function GET(_: Request, { params }: { params: Promise<{ className: string }> }) {
  const { className } = await params;
  const { context, period } = await requireDefaultUpsaContext();
  return NextResponse.json(await getAssessmentClassResultHybrid(context, period, decodeURIComponent(className)));
}
