import { NextResponse } from "next/server";
import { calculatePbdClassAnalysis } from "@/lib/pbd/analysis";
import { getAllPbdRecords } from "@/lib/pbd/data";
import { requireDefaultPbdContext } from "@/lib/defaultDataContext";

export async function GET(_: Request, { params }: { params: Promise<{ className: string }> }) {
  const { className } = await params;
  const { school, period } = await requireDefaultPbdContext();
  return NextResponse.json(calculatePbdClassAnalysis(decodeURIComponent(className), await getAllPbdRecords(school, period)));
}
