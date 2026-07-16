import { NextResponse } from "next/server";
import { calculatePbdSubjectAnalysis } from "@/lib/pbd/analysis";
import { getPbdSubjectRecords } from "@/lib/pbd/data";
import { requireDefaultPbdContext } from "@/lib/defaultDataContext";

export async function GET(_: Request, { params }: { params: Promise<{ subjectCode: string }> }) {
  const { subjectCode } = await params;
  const { school, period } = await requireDefaultPbdContext();
  return NextResponse.json(calculatePbdSubjectAnalysis(subjectCode, await getPbdSubjectRecords(school, period, subjectCode)));
}
