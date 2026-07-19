import { NextResponse } from "next/server";
import { calculatePbdSubjectAnalysis } from "@/lib/pbd/analysis";
import { getPbdSubjectRecords } from "@/lib/pbd/data";
import { getPbdPageContext, pbdSemesterFromRequest } from "@/lib/pbdPages";

export async function GET(request: Request, { params }: { params: Promise<{ year: string; subjectCode: string }> }) {
  const { subjectCode } = await params;
  const { school, period } = await getPbdPageContext(params, pbdSemesterFromRequest(request));
  return NextResponse.json(calculatePbdSubjectAnalysis(subjectCode, await getPbdSubjectRecords(school, period, subjectCode)));
}
