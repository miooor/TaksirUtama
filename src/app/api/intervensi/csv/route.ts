import { NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { currentSchoolReportFilename } from "@/lib/reportFilename";
import { requireSchoolContext } from "@/lib/auth";
import { buildDialogInterventionCsvRows, buildDialogInterventionRows } from "@/lib/dialog/interventionRows";
import { getAllPbdInterventions } from "@/lib/pbd/data";

export async function GET(request: NextRequest) {
  const school = await requireSchoolContext();
  const searchParams = request.nextUrl.searchParams;
  const year = searchParams.get("year");
  const className = searchParams.get("className") ?? searchParams.get("class");
  const subject = searchParams.get("subject");
  const { entries } = await getAllPbdInterventions(school, school.defaultPbdPeriod!);
  const filteredEntries = entries.filter((entry) => {
    if (year && entry.year !== Number(year)) return false;
    if (className && entry.className !== className) return false;
    if (subject && entry.subjectCode !== subject) return false;
    return true;
  });
  const rows = buildDialogInterventionCsvRows(buildDialogInterventionRows(filteredEntries));
  const csv = toCsv(rows);
  const label = [subject, year ? `TAHUN ${year}` : null, className].filter(Boolean).join(" - ") || "SEMUA";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${await currentSchoolReportFilename(`INTERVENSI DIALOG PRESTASI - ${label}.csv`)}"`,
    },
  });
}
