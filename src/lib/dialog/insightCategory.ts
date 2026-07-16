import type { DialogInsightBrief, DialogInsightCategory, DialogInsightClassRow, DialogInsightFinding } from "@/types/dialog";
import { formatNumber, formatPercent } from "@/lib/dialog/format";

function finding(category: DialogInsightCategory, title: string, evidence: string, severity: DialogInsightFinding["severity"]) {
  return { category, title, evidence, severity };
}

export function classifyDialogInsightFindings(
  metrics: DialogInsightBrief["metrics"],
  classRows: DialogInsightClassRow[],
  confidence: DialogInsightBrief["confidence"],
): DialogInsightFinding[] {
  const findings: DialogInsightFinding[] = [];
  const weakClass = classRows[0];
  const pass = metrics.upsaPassPercentage;
  const upsaIsWeak = pass !== null && (pass < 70 || metrics.upsaFailCount > 0);
  const pbdIsWeak = metrics.pbdLowPercentage >= 20 || metrics.pbdLowCount >= 5;
  const evidenceGap =
    pass !== null && metrics.pbdTotalPupils > 0
      ? Math.abs(pass - metrics.pbdHighPercentage) >= 20 || (pass >= 75 && metrics.pbdLowPercentage >= 20)
      : false;

  if (confidence !== "Lengkap") {
    findings.push(finding(
      "Data perlu semakan",
      "Semak liputan evidence sebelum membuat keputusan besar",
      `${confidence}: UPSA ${metrics.upsaEnteredCount} rekod, PBD ${metrics.pbdTotalPupils} rekod, belum ditaksir ${metrics.pbdNotAssessedCount}.`,
      "medium",
    ));
  }

  if (upsaIsWeak) {
    findings.push(finding(
      "Risiko akademik",
      "Pencapaian UPSA memerlukan perhatian panitia",
      `Lulus UPSA ${formatPercent(pass)} dengan ${metrics.upsaFailCount} gagal. ${weakClass ? `${weakClass.className} berada di kedudukan perhatian awal.` : ""}`.trim(),
      "high",
    ));
  }

  if (pbdIsWeak) {
    findings.push(finding(
      "Penguasaan rendah PBD",
      "TP1 dan TP2 perlu tindakan pengukuhan",
      `PBD TP1+TP2 ${formatPercent(metrics.pbdLowPercentage)} (${metrics.pbdLowCount} murid).`,
      "high",
    ));
  }

  if (evidenceGap) {
    findings.push(finding(
      "Jurang evidens UPSA/PBD",
      "UPSA dan PBD tidak menunjukkan cerita yang sama",
      `UPSA lulus ${formatPercent(pass)} berbanding PBD TP5+TP6 ${formatPercent(metrics.pbdHighPercentage)}.`,
      "medium",
    ));
  }

  if (!upsaIsWeak && !pbdIsWeak && confidence === "Lengkap" && metrics.pbdTotalPupils > 0) {
    findings.push(finding(
      "Kekuatan panitia",
      "Kekuatan boleh dikekalkan dan dikongsi",
      `Purata UPSA ${formatNumber(metrics.upsaAverage)}, lulus ${formatPercent(pass)}, PBD TP5+TP6 ${formatPercent(metrics.pbdHighPercentage)}.`,
      "positive",
    ));
  }

  return findings.length ? findings : [
    finding(
      "Data perlu semakan",
      "Belum cukup evidence untuk dapatan utama",
      "Padanan UPSA/PBD masih terhad untuk subjek dan tapisan semasa.",
      "medium",
    ),
  ];
}
