import { calculatePbdSubjectAnalysis } from "@/lib/pbd/analysis";
import { calculateUpsaClassAnalysis } from "@/lib/upsa/calculateUpsaClassAnalysis";
import { calculateUpsaYearAnalysis } from "@/lib/upsa/calculateUpsaYearAnalysis";
import { resolveAssessmentSubjectCode, resolvePbdSubjectCode } from "@/lib/insights/subjectMatching";
import { alternativeLanguageMissingCode, religionMoralMissingCode } from "@/lib/upsa/subjectPolicy";
import { classYear, formatPercent, normalizeUpsaClassName } from "@/lib/dialog/format";
import { classifyDialogInsightFindings } from "@/lib/dialog/insightCategory";
import { generateDialogQuestions, generateFocusSuggestions } from "@/lib/dialog/questionGenerator";
import { summarizeInterventionPupils } from "@/lib/pbd/intervention";
import type {
  DialogClassSummary,
  DialogComparisonPoint,
  DialogInsightBrief,
  DialogInsightClassRow,
  DialogInsightOverview,
  DialogSubjectSummary,
} from "@/types/dialog";
import type { PbdSubjectClassRecord } from "@/types/pbd";
import type { UpsaClassResult } from "@/types/upsa";
import type { PbdInterventionEntry } from "@/types/intervention";

type BuildDialogInsightBriefsInput = {
  upsaResults: UpsaClassResult[];
  pbdRecords: PbdSubjectClassRecord[];
  interventions?: PbdInterventionEntry[];
  selectedSubject?: string | null;
  selectedYear?: number | null;
  selectedClass?: string | null;
};

function weightedAverage(items: Array<{ value: number | null; count: number }>) {
  const totalCount = items.reduce((sum, item) => sum + item.count, 0);
  if (!totalCount) return null;
  return items.reduce((sum, item) => sum + (item.value ?? 0) * item.count, 0) / totalCount;
}

function attentionLevel(score: number): DialogInsightBrief["attentionLevel"] {
  if (score >= 90) return "Tinggi";
  if (score >= 45) return "Sederhana";
  return "Pantau";
}

function primaryCategory(brief: DialogInsightBrief) {
  return brief.findings[0]?.category ?? "Data perlu semakan";
}

function buildHandoffHref(subject: string, selectedYear: number | null, selectedClass: string | null) {
  const params = new URLSearchParams({ subject });
  if (selectedYear) params.set("year", String(selectedYear));
  if (selectedClass) params.set("className", selectedClass);
  return `/intervensi?${params.toString()}`;
}

function compareClassRows(a: DialogInsightClassRow, b: DialogInsightClassRow) {
  return b.attentionScore - a.attentionScore || a.className.localeCompare(b.className, "ms");
}

function makeClassAttentionScore(row: Omit<DialogInsightClassRow, "attentionScore">) {
  const upsaRisk = !row.upsaApplicable ? 0 : row.upsaPassPercentage === null ? 15 : Math.max(0, 100 - row.upsaPassPercentage);
  const pbdRisk = row.pbdLowPercentage;
  const interventionRisk = Math.min(30, row.interventionCount * 6);
  const dataRisk = row.pbdNotAssessedCount > 0 || (row.upsaApplicable && row.upsaEnteredCount === 0) || row.pbdTotalPupils === 0 ? 15 : 0;
  return upsaRisk + pbdRisk + interventionRisk + dataRisk;
}

function makeBriefConfidence(metrics: DialogInsightBrief["metrics"], pbdSubjectCode: string | null) {
  const notes: string[] = [];
  if (!pbdSubjectCode) notes.push("Subjek PBD sepadan tidak ditemui.");
  if (!metrics.upsaApplicable) notes.push("UPSA/UASA tidak berkaitan untuk Tahun 1, 2 dan 3; dapatan menggunakan PBD sahaja.");
  if (metrics.upsaApplicable && metrics.upsaEnteredCount === 0) notes.push("Tiada rekod UPSA bertanda untuk tapisan ini.");
  if (metrics.pbdTotalPupils === 0) notes.push("Tiada rekod PBD sepadan untuk tapisan ini.");
  if (metrics.pbdNotAssessedCount > 0) notes.push(`${metrics.pbdNotAssessedCount} murid PBD belum ditaksir.`);

  if (!pbdSubjectCode || (metrics.upsaEnteredCount === 0 && metrics.pbdTotalPupils === 0)) {
    return { confidence: "Tiada padanan UPSA/PBD" as const, notes };
  }
  if ((metrics.upsaApplicable && metrics.upsaEnteredCount === 0) || metrics.pbdTotalPupils === 0) {
    return { confidence: "Sebahagian" as const, notes };
  }
  if (metrics.pbdNotAssessedCount > 0) {
    return { confidence: "Perlu semakan" as const, notes };
  }
  return { confidence: "Lengkap" as const, notes: ["UPSA dan PBD mempunyai rekod sepadan untuk tapisan ini."] };
}

function makeWhySelected(brief: Pick<DialogInsightBrief, "subjectCode" | "attentionLevel" | "metrics" | "classRows">) {
  const weakClass = brief.classRows[0]?.className;
  const classText = weakClass ? ` Kelas perhatian awal: ${weakClass}.` : "";
  if (!brief.metrics.upsaApplicable) {
    return `${brief.subjectCode} berada pada tahap perhatian ${brief.attentionLevel.toLowerCase()} berdasarkan PBD sahaja: TP1+TP2 ${formatPercent(brief.metrics.pbdLowPercentage)}, TP5+TP6 ${formatPercent(brief.metrics.pbdHighPercentage)}, dan ${brief.metrics.repeatedRiskPupils} murid risiko berulang.${classText}`;
  }
  return `${brief.subjectCode} berada pada tahap perhatian ${brief.attentionLevel.toLowerCase()} kerana UPSA lulus ${formatPercent(brief.metrics.upsaPassPercentage)}, PBD TP1+TP2 ${formatPercent(brief.metrics.pbdLowPercentage)}, dan ${brief.metrics.repeatedRiskPupils} murid risiko berulang.${classText}`;
}

export function buildDialogInsightBriefs({
  upsaResults,
  pbdRecords,
  interventions = [],
  selectedSubject = null,
  selectedYear = null,
  selectedClass = null,
}: BuildDialogInsightBriefsInput): DialogInsightBrief[] {
  const pbdSubjectCodes = [...new Set(pbdRecords.map((record) => record.subjectCode))];
  const schoolUpsaAnalysis = calculateUpsaYearAnalysis("Sekolah", upsaResults);
  const readinessOnlyCodes = new Set([alternativeLanguageMissingCode, religionMoralMissingCode]);
  const upsaSubjectCodes = schoolUpsaAnalysis.subjectAnalyses
    .map((subject) => subject.subjectCode)
    .filter((subjectCode) => !readinessOnlyCodes.has(subjectCode));
  const matchedPbdSubjectCodes = new Set(
    upsaSubjectCodes
      .map((subjectCode) => resolvePbdSubjectCode(subjectCode, pbdSubjectCodes))
      .filter((subjectCode): subjectCode is string => subjectCode !== null),
  );
  const unmatchedPbdSubjectCodes = pbdSubjectCodes.filter((subjectCode) => !matchedPbdSubjectCodes.has(subjectCode));
  const canonicalSelectedSubject = selectedSubject
    ? resolveAssessmentSubjectCode(selectedSubject, upsaSubjectCodes) ?? selectedSubject
    : null;
  const subjectCodes = [...new Set([
    ...upsaSubjectCodes,
    ...unmatchedPbdSubjectCodes,
    ...(canonicalSelectedSubject ? [canonicalSelectedSubject] : []),
  ])];
  const normalizedSelectedClass = selectedClass ? selectedClass.toUpperCase() : null;
  const classAnalyses = upsaResults.map((result) => ({
    className: normalizeUpsaClassName(result.className),
    analysis: calculateUpsaClassAnalysis(result),
  }));

  return subjectCodes
    .map((subjectCode) => {
      const pbdSubjectCode = resolvePbdSubjectCode(subjectCode, pbdSubjectCodes) ?? (pbdSubjectCodes.includes(subjectCode) ? subjectCode : null);
      const pbdSubjectRecords = pbdSubjectCode
        ? pbdRecords.filter((record) =>
            record.subjectCode === pbdSubjectCode &&
            (!selectedYear || record.year === selectedYear) &&
            (!normalizedSelectedClass || record.className.toUpperCase() === normalizedSelectedClass),
          )
        : [];
      const pbdAnalysis = pbdSubjectCode ? calculatePbdSubjectAnalysis(pbdSubjectCode, pbdSubjectRecords) : null;
      const relevantClassNames = [
        ...new Set([
          ...classAnalyses.map((item) => item.className),
          ...pbdSubjectRecords.map((record) => record.className),
        ]),
      ].filter((className) =>
        (!selectedYear || classYear(className) === selectedYear) &&
        (!normalizedSelectedClass || className.toUpperCase() === normalizedSelectedClass),
      );

      const subjectInterventions = interventions.filter((entry) =>
        entry.subjectCode === (pbdSubjectCode ?? subjectCode) &&
        (!selectedYear || entry.year === selectedYear) &&
        (!normalizedSelectedClass || entry.normalizedClassName === normalizedSelectedClass),
      );
      const allFilteredInterventions = interventions.filter((entry) =>
        (!selectedYear || entry.year === selectedYear) &&
        (!normalizedSelectedClass || entry.normalizedClassName === normalizedSelectedClass),
      );
      const repeatedPupilKeys = new Set(
        summarizeInterventionPupils(allFilteredInterventions)
          .filter((pupil) => pupil.subjectCount >= 2)
          .map((pupil) => pupil.key),
      );
      const repeatedRiskPupils = summarizeInterventionPupils(subjectInterventions)
        .filter((pupil) => repeatedPupilKeys.has(pupil.key))
        .length;

      const classRows = relevantClassNames
        .map((className) => {
          const year = classYear(className);
          const upsaApplicable = year >= 4;
          const upsaSubject = classAnalyses
            .filter((item) => item.className === className)
            .map((item) => item.analysis.subjectAnalyses.find((subject) => subject.subjectCode === subjectCode))
            .find((subject) => subject);
          const pbdRecord = pbdSubjectRecords.find((record) => record.className === className);
          const interventionCount = summarizeInterventionPupils(subjectInterventions.filter((entry) => entry.className === className)).length;
          const rowWithoutScore = {
            className,
            year,
            upsaApplicable,
            upsaAverage: upsaApplicable ? upsaSubject?.average ?? null : null,
            upsaPassPercentage: upsaApplicable ? upsaSubject?.passPercentage ?? null : null,
            upsaFailCount: upsaApplicable ? upsaSubject?.failCount ?? 0 : 0,
            upsaEnteredCount: upsaApplicable ? upsaSubject?.enteredCount ?? 0 : 0,
            pbdLowCount: pbdRecord?.lowAchievementCount ?? 0,
            pbdLowPercentage: pbdRecord?.lowAchievementPercentage ?? 0,
            pbdHighCount: pbdRecord?.highAchievementCount ?? 0,
            pbdHighPercentage: pbdRecord?.highAchievementPercentage ?? 0,
            pbdTotalPupils: pbdRecord?.totalPupils ?? 0,
            pbdNotAssessedCount: pbdRecord?.notAssessedCount ?? 0,
            interventionCount,
          };
          return {
            ...rowWithoutScore,
            attentionScore: makeClassAttentionScore(rowWithoutScore),
          };
        })
        .sort(compareClassRows);

      const upsaEnteredCount = classRows.reduce((sum, row) => sum + row.upsaEnteredCount, 0);
      const upsaFailCount = classRows.reduce((sum, row) => sum + row.upsaFailCount, 0);
      const upsaPassCount = classRows.reduce((sum, row) => {
        if (row.upsaPassPercentage === null) return sum;
        return sum + Math.round((row.upsaPassPercentage / 100) * row.upsaEnteredCount);
      }, 0);
      const pbdLowCount = pbdAnalysis?.aggregateTpCounts.TP1 ?? 0;
      const pbdLowCountTotal = pbdLowCount + (pbdAnalysis?.aggregateTpCounts.TP2 ?? 0);
      const pbdHighCount = (pbdAnalysis?.aggregateTpCounts.TP5 ?? 0) + (pbdAnalysis?.aggregateTpCounts.TP6 ?? 0);
      const pbdTotalPupils = pbdAnalysis?.totalPupils ?? 0;
      const upsaApplicable = classRows.some((row) => row.upsaApplicable);
      const metrics = {
        upsaAverage: weightedAverage(classRows.map((row) => ({ value: row.upsaAverage, count: row.upsaEnteredCount }))),
        upsaPassPercentage: upsaEnteredCount ? (upsaPassCount / upsaEnteredCount) * 100 : null,
        upsaFailCount,
        upsaEnteredCount,
        pbdLowCount: pbdLowCountTotal,
        pbdLowPercentage: pbdTotalPupils ? (pbdLowCountTotal / pbdTotalPupils) * 100 : 0,
        pbdHighCount,
        pbdHighPercentage: pbdTotalPupils ? (pbdHighCount / pbdTotalPupils) * 100 : 0,
        pbdTotalPupils,
        pbdNotAssessedCount: pbdAnalysis?.totalNotAssessed ?? 0,
        repeatedRiskPupils,
        upsaApplicable,
      };
      const { confidence, notes } = makeBriefConfidence(metrics, pbdSubjectCode);
      const attentionScore = Math.round((classRows[0]?.attentionScore ?? 0) + Math.min(30, repeatedRiskPupils * 5));
      const findings = classifyDialogInsightFindings(metrics, classRows, confidence);
      const partialBrief = {
        subjectCode,
        pbdSubjectCode: pbdSubjectCode ?? subjectCode,
        subjectName: pbdAnalysis?.subjectName ?? subjectCode,
        selectedYear,
        selectedClass,
        attentionScore,
        attentionLevel: attentionLevel(attentionScore),
        confidence,
        confidenceNotes: notes,
        whySelected: "",
        metrics,
        classRows,
        findings,
        questions: [],
        focusSuggestions: [],
        handoffHref: buildHandoffHref(pbdSubjectCode ?? subjectCode, selectedYear, selectedClass),
      } satisfies DialogInsightBrief;
      return {
        ...partialBrief,
        whySelected: makeWhySelected(partialBrief),
        questions: generateDialogQuestions(partialBrief),
        focusSuggestions: generateFocusSuggestions(partialBrief),
      };
    })
    .filter((brief) => selectedSubject ? brief.subjectCode === selectedSubject || brief.pbdSubjectCode === selectedSubject : true)
    .sort((a, b) => b.attentionScore - a.attentionScore || a.subjectCode.localeCompare(b.subjectCode, "ms"));
}

export function selectDialogInsightBrief(briefs: DialogInsightBrief[], selectedSubject?: string | null) {
  if (!briefs.length) return null;
  if (selectedSubject) {
    return briefs.find((brief) => brief.subjectCode === selectedSubject || brief.pbdSubjectCode === selectedSubject) ?? briefs[0]!;
  }
  return briefs[0]!;
}

function pointDetail(upsaLabel: string, upsaValue: number | null, pbdLabel: string, pbdValue: number, risk: number) {
  return `${upsaLabel} ${formatPercent(upsaValue)}, ${pbdLabel} ${formatPercent(pbdValue)}, TP1+TP2 ${formatPercent(risk)}.`;
}

function summaryPoint({
  label,
  href,
  x,
  y,
  risk,
  category,
  attentionLevel,
  detail,
}: DialogComparisonPoint): DialogComparisonPoint {
  return {
    label,
    href,
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    risk: Number.isFinite(risk) ? risk : 0,
    category,
    attentionLevel,
    detail,
  };
}

export function buildDialogInsightOverview(briefs: DialogInsightBrief[]): DialogInsightOverview {
  const subjectSummaries = briefs.map<DialogSubjectSummary>((brief) => ({
    subjectCode: brief.subjectCode,
    pbdSubjectCode: brief.pbdSubjectCode,
    subjectName: brief.subjectName,
    category: primaryCategory(brief),
    attentionScore: brief.attentionScore,
    attentionLevel: brief.attentionLevel,
    confidence: brief.confidence,
    upsaApplicable: brief.metrics.upsaApplicable,
    upsaAverage: brief.metrics.upsaAverage,
    upsaPassPercentage: brief.metrics.upsaPassPercentage,
    pbdLowPercentage: brief.metrics.pbdLowPercentage,
    pbdHighPercentage: brief.metrics.pbdHighPercentage,
    pbdLowCount: brief.metrics.pbdLowCount,
    pbdHighCount: brief.metrics.pbdHighCount,
    weakestClass: brief.classRows[0]?.className ?? null,
    handoffHref: brief.handoffHref,
  }));

  const classMap = new Map<string, DialogInsightClassRow[]>();
  for (const brief of briefs) {
    for (const row of brief.classRows) {
      classMap.set(row.className, [...(classMap.get(row.className) ?? []), row]);
    }
  }

  const classSummaries = [...classMap.entries()]
    .map<DialogClassSummary>(([className, rows]) => {
      const upsaEnteredCount = rows.reduce((sum, row) => sum + row.upsaEnteredCount, 0);
      const upsaPassCount = rows.reduce((sum, row) => {
        if (row.upsaPassPercentage === null) return sum;
        return sum + Math.round((row.upsaPassPercentage / 100) * row.upsaEnteredCount);
      }, 0);
      const pbdTotalPupils = rows.reduce((sum, row) => sum + row.pbdTotalPupils, 0);
      const pbdLowCount = rows.reduce((sum, row) => sum + row.pbdLowCount, 0);
      const pbdHighCount = rows.reduce((sum, row) => sum + row.pbdHighCount, 0);
      const attentionScore = Math.round(Math.max(...rows.map((row) => row.attentionScore), 0));
      const upsaApplicable = rows.some((row) => row.upsaApplicable);
      const riskRows = rows
        .map((row) => ({ row, subject: briefs.find((brief) => brief.classRows.includes(row))?.subjectCode ?? "" }))
        .filter((item) => item.row.attentionScore >= 45 && item.subject);
      return {
        className,
        year: rows[0]?.year ?? 0,
        category: pbdLowCount > 0 || upsaPassCount < upsaEnteredCount ? "Risiko akademik" : "Kekuatan panitia",
        attentionScore,
        upsaApplicable,
        upsaAverage: weightedAverage(rows.map((row) => ({ value: row.upsaAverage, count: row.upsaEnteredCount }))),
        upsaPassPercentage: upsaEnteredCount ? (upsaPassCount / upsaEnteredCount) * 100 : null,
        pbdLowPercentage: pbdTotalPupils ? (pbdLowCount / pbdTotalPupils) * 100 : 0,
        pbdHighPercentage: pbdTotalPupils ? (pbdHighCount / pbdTotalPupils) * 100 : 0,
        pbdLowCount,
        pbdHighCount,
        pbdTotalPupils,
        pbdNotAssessedCount: rows.reduce((sum, row) => sum + row.pbdNotAssessedCount, 0),
        subjectsAtRisk: riskRows.length,
        weakestSubjects: riskRows
          .sort((a, b) => b.row.attentionScore - a.row.attentionScore)
          .map((item) => item.subject)
          .slice(0, 4),
      };
    })
    .sort((a, b) => b.attentionScore - a.attentionScore || a.className.localeCompare(b.className, "ms"));

  return {
    subjectSummaries,
    classSummaries,
    subjectAlignmentPoints: subjectSummaries.map((summary) => summaryPoint({
      label: summary.subjectCode,
      href: `/insights?subject=${encodeURIComponent(summary.subjectCode)}`,
      x: summary.upsaPassPercentage ?? 0,
      y: summary.pbdHighPercentage,
      risk: summary.pbdLowPercentage,
      category: summary.category,
      attentionLevel: summary.attentionLevel,
      detail: pointDetail("UPSA lulus", summary.upsaPassPercentage, "PBD TP5+TP6", summary.pbdHighPercentage, summary.pbdLowPercentage),
    })),
    subjectRiskPoints: subjectSummaries.map((summary) => summaryPoint({
      label: summary.subjectCode,
      href: `/insights?subject=${encodeURIComponent(summary.subjectCode)}`,
      x: summary.upsaPassPercentage ?? 0,
      y: summary.pbdLowPercentage,
      risk: summary.pbdLowPercentage,
      category: summary.category,
      attentionLevel: summary.attentionLevel,
      detail: pointDetail("UPSA lulus", summary.upsaPassPercentage, "PBD TP1+TP2", summary.pbdLowPercentage, summary.pbdLowPercentage),
    })),
    classAlignmentPoints: classSummaries.map((summary) => summaryPoint({
      label: summary.className,
      x: summary.upsaAverage ?? 0,
      y: summary.pbdHighPercentage,
      risk: summary.pbdLowPercentage,
      category: summary.category,
      attentionLevel: attentionLevel(summary.attentionScore),
      detail: pointDetail("Purata UPSA", summary.upsaAverage, "PBD TP5+TP6", summary.pbdHighPercentage, summary.pbdLowPercentage),
    })),
    classRiskPoints: classSummaries.map((summary) => summaryPoint({
      label: summary.className,
      x: summary.upsaAverage ?? 0,
      y: summary.pbdLowPercentage,
      risk: summary.pbdLowPercentage,
      category: summary.category,
      attentionLevel: attentionLevel(summary.attentionScore),
      detail: pointDetail("Purata UPSA", summary.upsaAverage, "PBD TP1+TP2", summary.pbdLowPercentage, summary.pbdLowPercentage),
    })),
  };
}
