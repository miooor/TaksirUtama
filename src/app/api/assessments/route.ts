import { NextResponse } from "next/server";
import { hasGoogleCredentials } from "@/lib/config/env";
import { requireSchoolContext } from "@/lib/auth";

export async function GET() {
  const { assessmentPeriods, pbdPeriods } = await requireSchoolContext();
  return NextResponse.json({
    assessments: assessmentPeriods.filter((period) => period.enabled).map((period) => ({
      year: period.year,
      assessment: period.assessment,
      examName: period.examName,
      status: hasGoogleCredentials ? "connected" : "unavailable",
    })),
    pbd: pbdPeriods.filter((period) => period.enabled).map((period) => ({
      year: period.year,
      reportName: period.reportName,
      status: hasGoogleCredentials ? "connected" : "unavailable",
    })),
  });
}
