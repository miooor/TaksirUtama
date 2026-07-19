import { renderToBuffer } from "@react-pdf/renderer";
import { requireSchoolContext } from "@/lib/auth";
import { getAllPbdInterventions } from "@/lib/pbd/data";
import { resolveInterventionQueryContext } from "@/lib/pbd/interventionContext";
import { DialogPrestasiInterventionReportTemplate } from "@/pdf/templates/DialogPrestasiInterventionReportTemplate";
import { schoolReportFilename } from "@/lib/reportFilename";

export async function GET(request: Request, { params }: { params: Promise<{ year: string; subjectCode: string }> }) {
  const { year, subjectCode } = await params;
  const school = await requireSchoolContext();
  const url = new URL(request.url);
  const selection = resolveInterventionQueryContext(school, { year, semester: url.searchParams.get("semester") });
  const pbdPeriod = selection.period;

  const { entries, issues } = await getAllPbdInterventions(school, pbdPeriod);
  const subjectEntries = entries.filter((entry) => entry.subjectCode === subjectCode);
  const subjectIssues = issues.filter((issue) => issue.subjectCode === subjectCode);
  const buffer = await renderToBuffer(DialogPrestasiInterventionReportTemplate({
    subjectCode,
    calendarYear: year,
    reportName: `${pbdPeriod.reportName} · Semester ${selection.semester}`,
    entries: subjectEntries,
    issues: subjectIssues,
    school,
  }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${schoolReportFilename(school, `${subjectCode} - INTERVENSI DAN ISU ${year}.pdf`)}"`,
    },
  });
}
