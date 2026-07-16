import { NextResponse } from "next/server";
import { listPbdSubjectTabs } from "@/lib/pbd/data";
import { requireDefaultPbdContext } from "@/lib/defaultDataContext";

export async function GET() {
  const { school, period } = await requireDefaultPbdContext();
  return NextResponse.json(await listPbdSubjectTabs(school, period));
}
