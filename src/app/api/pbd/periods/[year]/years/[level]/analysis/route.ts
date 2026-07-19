import { NextResponse } from "next/server";
import { calculatePbdYearAnalysis } from "@/lib/pbd/analysis";
import { getAllPbdRecords } from "@/lib/pbd/data";
import { getPbdPageContext, pbdSemesterFromRequest } from "@/lib/pbdPages";

export async function GET(request: Request, { params }: { params: Promise<{ year: string; level: string }> }) {
  const { level } = await params;
  const { school, period } = await getPbdPageContext(params, pbdSemesterFromRequest(request));
  return NextResponse.json(calculatePbdYearAnalysis(Number(level), await getAllPbdRecords(school, period)));
}
