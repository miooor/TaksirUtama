import { renderToBuffer } from "@react-pdf/renderer";
import { requireSchoolContext } from "@/lib/auth";
import { resolvePbdPeriod } from "@/lib/config/periods";
import { getAllPbdInterventions } from "@/lib/pbd/data";
import { DialogPrestasiInterventionReportTemplate } from "@/pdf/templates/DialogPrestasiInterventionReportTemplate";
import { schoolReportFilename } from "@/lib/reportFilename";

export async function GET(_: Request, { params }: { params: Promise<{ year: string; subjectCode: string }> }) {
  const { year, subjectCode } = await params;
  const school = await requireSchoolContext();
  const { pbdPeriods } = school;
  const pbdPeriod = resolvePbdPeriod(pbdPeriods, year);
  if (!pbdPeriod) return new Response("Tempoh PBD tidak tersedia.", { status: 404 });

  const { entries, issues } = await getAllPbdInterventions(school, pbdPeriod);
  const subjectEntries = entries.filter((entry) => entry.subjectCode === subjectCode);
  const subjectIssues = issues.filter((issue) => issue.subjectCode === subjectCode);
  const buffer = await renderToBuffer(DialogPrestasiInterventionReportTemplate({
    subjectCode,
    calendarYear: year,
    reportName: pbdPeriod.reportName,
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
