import { renderToBuffer } from "@react-pdf/renderer";
import { requireActorContext } from "@/lib/auth/actor";
import { createPlaceholderAssessmentPeriod, resolveAssessmentPeriod, resolvePbdPeriod } from "@/lib/config/periods";
import { isDatabaseConfigured } from "@/lib/db/client";
import { buildDialogPrestasiUpsaSubjectReport } from "@/lib/dialogPrestasi/reportData";
import { resolveAssessmentSubjectCode } from "@/lib/insights/subjectMatching";
import { getAllAssessmentClassResultsHybrid } from "@/lib/upsa/data";
import { DialogPrestasiUpsaSubjectReportTemplate } from "@/pdf/templates/DialogPrestasiUpsaSubjectReportTemplate";
import { schoolReportFilename } from "@/lib/reportFilename";

export async function GET(_: Request, { params }: { params: Promise<{ year: string; subjectCode: string }> }) {
  const { year, subjectCode } = await params;
  const context = await requireActorContext();
  const school = context.school;
  const { assessmentPeriods, pbdPeriods } = school;
  const pbdPeriod = resolvePbdPeriod(pbdPeriods, year);
  const upsaPeriod = resolveAssessmentPeriod(assessmentPeriods, year, "upsa")
    ?? (isDatabaseConfigured() ? createPlaceholderAssessmentPeriod(year, "upsa") : null);
  if (!pbdPeriod || !upsaPeriod) return new Response("Tempoh laporan tidak tersedia.", { status: 404 });

  const results = await getAllAssessmentClassResultsHybrid(context, upsaPeriod);
  if (results.length === 0) return new Response("Tiada data UPSA dalam pangkalan data.", { status: 404 });
  const assessmentCodes = new Set(results.flatMap((result) => result.students.flatMap((student) => student.subjects.map((subject) => subject.subjectCode))));
  const assessmentSubjectCode = resolveAssessmentSubjectCode(subjectCode, assessmentCodes);
  if (!assessmentSubjectCode) return new Response("Subjek UPSA yang sepadan tidak ditemui.", { status: 404 });

  const report = buildDialogPrestasiUpsaSubjectReport({
    calendarYear: year,
    assessmentLabel: "UPSA",
    assessmentName: upsaPeriod.examName,
    subjectCode: assessmentSubjectCode,
    pbdSubjectCode: subjectCode,
    results,
  });
  const buffer = await renderToBuffer(DialogPrestasiUpsaSubjectReportTemplate({ report, school }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${schoolReportFilename(school, `${subjectCode} - ANALISA PERBANDINGAN UPSA ${year}.pdf`)}"`,
    },
  });
}
