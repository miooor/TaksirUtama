import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { calculatePbdClassAnalysis, calculatePbdSubjectAnalysis, calculatePbdYearAnalysis } from "@/lib/pbd/analysis";
import { buildUpsaYearSummaryReport } from "@/lib/pdf/reportData";
import { calculateUpsaClassAnalysis } from "@/lib/upsa/calculateUpsaClassAnalysis";
import { SkspsPbdSubjectReportTemplate } from "@/pdf/templates/SkspsPbdSubjectReportTemplate";
import { SkspsPbdClassReportTemplate } from "@/pdf/templates/SkspsPbdClassReportTemplate";
import { SkspsPbdYearReportTemplate } from "@/pdf/templates/SkspsPbdYearReportTemplate";
import { SkspsUpsaAnalysisReportTemplate } from "@/pdf/templates/SkspsUpsaAnalysisReportTemplate";
import { SkspsUpsaYearSummaryReportTemplate } from "@/pdf/templates/SkspsUpsaYearSummaryReportTemplate";
import { DialogPrestasiUpsaSubjectReportTemplate } from "@/pdf/templates/DialogPrestasiUpsaSubjectReportTemplate";
import { DialogPrestasiInterventionReportTemplate } from "@/pdf/templates/DialogPrestasiInterventionReportTemplate";
import { buildDialogPrestasiUpsaSubjectReport } from "@/lib/dialogPrestasi/reportData";
import type { AssessmentPeriod } from "@/lib/config/periods";
import type { PbdSubjectClassRecord } from "@/types/pbd";
import type { UpsaClassResult, UpsaSubjectResult } from "@/types/upsa";
import type { PbdInterventionEntry } from "@/types/intervention";
import type { SchoolPublicProfile } from "@/lib/config/schools";

describe("PDF report templates", () => {
  it("renders upgraded PBD and UPSA report PDFs", async () => {
    const pbdRecords = [
      pbdRecord("BI", "2 Angsana", [1, 2, 5, 8, 3, 1]),
      pbdRecord("BI", "2 Bakawali", [0, 1, 4, 8, 5, 2]),
      pbdRecord("BM", "2 Angsana", [2, 3, 5, 7, 2, 1]),
    ];
    const upsaResults = [
      upsaClass("2 Angsana", [
        subject("BM", 80, "A"),
        subject("BA", 70, "B"),
        subject("PAI", 45, "D"),
      ]),
      upsaClass("2 Bakawali", [
        subject("BM", 55, "C"),
        subject("BTSK", 35, "E"),
        subject("MORAL", 30, "F"),
      ]),
    ];
    const pbdSubject = calculatePbdSubjectAnalysis("BI", pbdRecords);
    const pbdClass = calculatePbdClassAnalysis("2 Angsana", pbdRecords);
    const pbdYear = calculatePbdYearAnalysis(2, pbdRecords);
    const upsaClassAnalysis = calculateUpsaClassAnalysis(upsaResults[0]!);
    const upsaYearReport = buildUpsaYearSummaryReport(period, upsaResults);
    const dialogResults = [
      upsaClass("4 Angsana", [subject("BM", 84, "A")]),
      upsaClass("4 Bakawali", [subject("BM", 68, "B")]),
      upsaClass("5 Angsana", [subject("BM", 52, "C")]),
      upsaClass("6 Angsana", [subject("BM", 42, "D")]),
    ];
    const dialogUpsaReport = buildDialogPrestasiUpsaSubjectReport({ calendarYear: "2026", assessmentLabel: "UPSA", assessmentName: "UPSA 2026", subjectCode: "BM", pbdSubjectCode: "BM", results: dialogResults });
    const interventionEntries: PbdInterventionEntry[] = [{ subjectCode: "BM", studentName: "Murid Contoh", normalizedStudentName: "MURID CONTOH", className: "4 ANGSANA", normalizedClassName: "4 ANGSANA", year: 4, tp: 1, problem: "Belum menguasai kemahiran asas.", intervention: "Bimbingan berfokus dua kali seminggu." }];

    await expectPdf(SkspsPbdSubjectReportTemplate({ analysis: pbdSubject, school }));
    await expectPdf(SkspsPbdClassReportTemplate({ analysis: pbdClass, school }));
    await expectPdf(SkspsPbdYearReportTemplate({ analysis: pbdYear, school }));
    await expectPdf(SkspsUpsaAnalysisReportTemplate({ result: upsaResults[0]!, analysis: upsaClassAnalysis, period, school }));
    await expectPdf(SkspsUpsaYearSummaryReportTemplate({ report: upsaYearReport, school }));
    await expectPdf(DialogPrestasiUpsaSubjectReportTemplate({ report: dialogUpsaReport, school }));
    await expectPdf(DialogPrestasiInterventionReportTemplate({ subjectCode: "BM", calendarYear: "2026", reportName: "PBD 2026", entries: interventionEntries, issues: [], school }));
  }, 30000);
});

async function expectPdf(document: Parameters<typeof renderToBuffer>[0]) {
  const buffer = await renderToBuffer(document);
  expect(buffer.length).toBeGreaterThan(1000);
}

const period: AssessmentPeriod = {
  year: "2026",
  assessment: "upsa",
  spreadsheetId: "sheet",
  examName: "UPSA 2026",
  slipTitle: "UPSA 2026",
  enabled: true,
  default: true,
};

const school: SchoolPublicProfile = {
  id: "school-a",
  code: "SCH-A",
  slug: "school-a",
  name: "Sekolah Contoh A",
  systemName: "Analisa Kurikulum",
  logoPath: "/logo.png",
  letterheadPath: "/logo.png",
  headteacher: { name: "GURU BESAR CONTOH", title: "Guru Besar" },
  locale: "ms",
  timezone: "Asia/Kuala_Lumpur",
};

function pbdRecord(subjectCode: string, className: string, tp: [number, number, number, number, number, number]): PbdSubjectClassRecord {
  const total = tp.reduce((sum, value) => sum + value, 0);
  return {
    subjectCode,
    subjectName: subjectCode,
    className,
    year: Number(className[0]),
    tpCounts: { TP1: tp[0], TP2: tp[1], TP3: tp[2], TP4: tp[3], TP5: tp[4], TP6: tp[5] },
    tpPercentages: {
      TP1: (tp[0] / total) * 100,
      TP2: (tp[1] / total) * 100,
      TP3: (tp[2] / total) * 100,
      TP4: (tp[3] / total) * 100,
      TP5: (tp[4] / total) * 100,
      TP6: (tp[5] / total) * 100,
    },
    totalPupils: total,
    notAssessedCount: 0,
    lowAchievementCount: tp[0] + tp[1],
    lowAchievementPercentage: ((tp[0] + tp[1]) / total) * 100,
    highAchievementCount: tp[4] + tp[5],
    highAchievementPercentage: ((tp[4] + tp[5]) / total) * 100,
    dominantTpBand: "TP4",
    dataIssues: [],
  };
}

function upsaClass(className: string, subjects: UpsaSubjectResult[]): UpsaClassResult {
  return {
    className,
    teacherName: "Teacher",
    students: subjects.map((subjectItem, index) => ({
      id: `${className}-${index}`,
      bil: String(index + 1),
      name: `Pupil ${index + 1}`,
      className,
      teacherName: "Teacher",
      subjects: [subjectItem],
      average: subjectItem.mark,
      totalMarks: subjectItem.mark,
      validSubjectCount: subjectItem.mark === null ? 0 : 1,
      missingSubjects: [],
      absentSubjects: [],
    })),
  };
}

function subject(subjectCode: string, mark: number, grade: string): UpsaSubjectResult {
  return {
    subjectCode,
    subjectName: subjectCode,
    mark,
    maxMark: 100,
    grade,
    status: "marked",
  };
}
