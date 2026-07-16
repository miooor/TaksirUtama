import { NextResponse } from "next/server";
import { calculatePbdYearAnalysis } from "@/lib/pbd/analysis";
import { getAllPbdRecords } from "@/lib/pbd/data";
import { requireDefaultPbdContext } from "@/lib/defaultDataContext";

export async function GET(_: Request, { params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const { school, period } = await requireDefaultPbdContext();
  return NextResponse.json(calculatePbdYearAnalysis(Number(year), await getAllPbdRecords(school, period)));
}
