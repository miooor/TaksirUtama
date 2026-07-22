import { renderToBuffer } from "@react-pdf/renderer";
import { requireActorContext } from "@/lib/auth/actor";
import { resolveAssessmentPeriod, resolvePbdPeriod, type AssessmentType } from "@/lib/config/periods";
import { buildDialogPrestasiUpsaSubjectReport } from "@/lib/dialogPrestasi/reportData";
import { resolveAssessmentSubjectCode } from "@/lib/insights/subjectMatching";
import { getAllAssessmentClassResultsHybrid } from "@/lib/upsa/data";
import { DialogPrestasiUpsaSubjectReportTemplate } from "@/pdf/templates/DialogPrestasiUpsaSubjectReportTemplate";
import { schoolReportFilename } from "@/lib/reportFilename";

export async function GET(_: Request, { params }: { params: Promise<{ year: string; assessment: string; subjectCode: string }> }) {
  const { year, assessment, subjectCode } = await params;
  const context = await requireActorContext();
  const school = context.school;
  const { assessmentPeriods, pbdPeriods } = school;
  if (assessment !== "upsa" && assessment !== "uasa") return new Response("Pentaksiran tidak sah.", { status: 404 });
  const assessmentType = assessment as AssessmentType;
  const pbdPeriod = resolvePbdPeriod(pbdPeriods, year);
  const period = resolveAssessmentPeriod(assessmentPeriods, year, assessmentType);
  if (!pbdPeriod || !period) return new Response(`Tempoh ${assessment.toUpperCase()} tidak tersedia.`, { status: 404 });

  const results = await getAllAssessmentClassResultsHybrid(context, period);
  if (results.length === 0) return new Response(`Tiada data ${assessment.toUpperCase()} dalam pangkalan data.`, { status: 404 });
  const assessmentCodes = new Set(results.flatMap((result) => result.students.flatMap((student) => student.subjects.map((subject) => subject.subjectCode))));
  const assessmentSubjectCode = resolveAssessmentSubjectCode(subjectCode, assessmentCodes);
  if (!assessmentSubjectCode) return new Response(`Subjek ${assessment.toUpperCase()} yang sepadan tidak ditemui.`, { status: 404 });

  const label = assessment.toUpperCase();
  const report = buildDialogPrestasiUpsaSubjectReport({
    calendarYear: year,
    assessmentLabel: label,
    assessmentName: period.examName,
    subjectCode: assessmentSubjectCode,
    pbdSubjectCode: subjectCode,
    results,
  });
  const buffer = await renderToBuffer(DialogPrestasiUpsaSubjectReportTemplate({ report, school }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${schoolReportFilename(school, `${subjectCode} - ANALISA PERBANDINGAN ${label} ${year}.pdf`)}"`,
    },
  });
}
