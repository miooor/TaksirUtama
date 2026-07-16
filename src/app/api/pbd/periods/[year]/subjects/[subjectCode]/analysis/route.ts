import { NextResponse } from "next/server";
import { calculatePbdSubjectAnalysis } from "@/lib/pbd/analysis";
import { getPbdSubjectRecords } from "@/lib/pbd/data";
import { getPbdPageContext } from "@/lib/pbdPages";

export async function GET(_: Request, { params }: { params: Promise<{ year: string; subjectCode: string }> }) {
  const { subjectCode } = await params;
  const { school, period } = await getPbdPageContext(params);
  return NextResponse.json(calculatePbdSubjectAnalysis(subjectCode, await getPbdSubjectRecords(school, period, subjectCode)));
}
