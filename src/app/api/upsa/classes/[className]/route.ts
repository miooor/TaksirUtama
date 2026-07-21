import { NextResponse } from "next/server";
import { getAssessmentClassResultWithRegistry } from "@/lib/upsa/data";
import { requireDefaultUpsaContext } from "@/lib/defaultDataContext";

export async function GET(_: Request, { params }: { params: Promise<{ className: string }> }) {
  const { className } = await params;
  const { context, school, period } = await requireDefaultUpsaContext();
  return NextResponse.json(await getAssessmentClassResultWithRegistry(context, period, decodeURIComponent(className)));
}
