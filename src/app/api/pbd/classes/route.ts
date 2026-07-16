import { NextResponse } from "next/server";
import { listPbdClasses } from "@/lib/pbd/data";
import { requireDefaultPbdContext } from "@/lib/defaultDataContext";

export async function GET() {
  const { school, period } = await requireDefaultPbdContext();
  return NextResponse.json(await listPbdClasses(school, period));
}
