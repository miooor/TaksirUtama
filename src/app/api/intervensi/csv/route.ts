import { NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { currentSchoolReportFilename } from "@/lib/reportFilename";
import { requireSchoolContext } from "@/lib/auth";
import { buildDialogInterventionCsvRows, buildDialogInterventionRows } from "@/lib/dialog/interventionRows";
import { getAllPbdInterventions } from "@/lib/pbd/data";
import { resolveInterventionQueryContext } from "@/lib/pbd/interventionContext";

export async function GET(request: NextRequest) {
  const school = await requireSchoolContext();
  const searchParams = request.nextUrl.searchParams;
  const selection = resolveInterventionQueryContext(school, { year: searchParams.get("year"), semester: searchParams.get("semester"), level: searchParams.get("level") });
  const className = searchParams.get("className") ?? searchParams.get("class");
  const subject = searchParams.get("subject");
  const classId = searchParams.get("classId");
  const subjectId = searchParams.get("subjectId");
  const { entries } = await getAllPbdInterventions(school, selection.period);
  const filteredEntries = entries.filter((entry) => {
    if (selection.level && entry.year !== selection.level) return false;
    if (classId ? entry.classId !== classId : className && entry.className !== className) return false;
    if (subjectId ? entry.subjectId !== subjectId : subject && entry.subjectCode !== subject) return false;
    return true;
  });
  const rows = buildDialogInterventionCsvRows(buildDialogInterventionRows(filteredEntries));
  const csv = toCsv(rows);
  const label = [subject, selection.level ? `TAHUN ${selection.level}` : null, className, `SEMESTER ${selection.semester}`, selection.year].filter(Boolean).join(" - ") || "SEMUA";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${await currentSchoolReportFilename(`INTERVENSI DIALOG PRESTASI - ${label}.csv`)}"`,
    },
  });
}
