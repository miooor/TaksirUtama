import { NextResponse } from "next/server";
import { calculatePbdYearAnalysis } from "@/lib/pbd/analysis";
import { getAllPbdRecords } from "@/lib/pbd/data";
import { getPbdPageContext } from "@/lib/pbdPages";

export async function GET(_: Request, { params }: { params: Promise<{ year: string; level: string }> }) {
  const { level } = await params;
  const { school, period } = await getPbdPageContext(params);
  return NextResponse.json(calculatePbdYearAnalysis(Number(level), await getAllPbdRecords(school, period)));
}
