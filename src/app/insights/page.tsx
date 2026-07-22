import Link from "next/link";
import { ArrowRight, ClipboardList, Telescope } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { DialogEvidenceHeatmap } from "@/components/shared/DialogEvidenceHeatmap";
import { DialogEvidenceMatrix } from "@/components/shared/DialogEvidenceMatrix";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getAllPbdInterventions, getAllPbdRecords } from "@/lib/pbd/data";
import { getAllAssessmentClassResults } from "@/lib/upsa/data";
import { requireSchoolContext } from "@/lib/auth";
import { DataSourceError } from "@/lib/dataSourceError";
import { buildDialogInsightBriefs, buildDialogInsightOverview, selectDialogInsightBrief } from "@/lib/dialog/insightBrief";
import { formatNumber, formatPercent } from "@/lib/dialog/format";
import { getLanguage, text } from "@/lib/i18n";
import type { DialogInsightBrief, DialogInsightFinding, DialogInsightOverview } from "@/types/dialog";
import { resolveInterventionQueryContext } from "@/lib/pbd/interventionContext";

type SearchParams = {
  subject?: string;
  year?: string;
  semester?: string;
  level?: string;
  className?: string;
};

function parseYear(value: string | undefined) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1 && year <= 6 ? year : null;
}

function confidenceTone(confidence: DialogInsightBrief["confidence"]) {
  return confidence === "Lengkap" ? "success" : confidence === "Tiada padanan UPSA/PBD" ? "warning" : "default";
}

function findingTone(finding: DialogInsightFinding) {
  return finding.severity === "positive" ? "success" : finding.severity === "high" ? "warning" : "default";
}

function attentionTag(score: number) {
  if (score >= 90) return "Perlu perhatian";
  if (score >= 45) return "Pantau";
  return "Kekuatan";
}

function attentionTone(score: number) {
  if (score >= 90) return "warning" as const;
  if (score >= 45) return "default" as const;
  return "success" as const;
}

function upsaValue(applicable: boolean, value: number | null) {
  return applicable ? formatNumber(value) : "N/A";
}

function upsaPercent(applicable: boolean, value: number | null) {
  return applicable ? formatPercent(value) : "N/A";
}

export default async function SchoolInsightsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const language = await getLanguage();
  const school = await requireSchoolContext();
  if (!school.defaultUpsaPeriod || !school.defaultPbdPeriod) {
    throw new DataSourceError("workbook_inaccessible", "UPSA and PBD must be configured before insights are available.", "upsa");
  }
  const params = await searchParams;
  const { subject, year, className } = params;
  const selection = resolveInterventionQueryContext(school, { year, semester: params.semester, level: params.level });
  const selectedYear = selection.level ?? parseYear(year);
  const selectedClass = className ?? null;
  const [upsaResults, pbdRecords, interventionData] = await Promise.all([
    getAllAssessmentClassResults(school, school.defaultUpsaPeriod),
    getAllPbdRecords(school, selection.period),
    getAllPbdInterventions(school, selection.period),
  ]);
  const allBriefs = buildDialogInsightBriefs({
    upsaResults,
    pbdRecords,
    interventions: interventionData.entries,
    selectedYear,
    selectedClass,
  });
  const briefs = buildDialogInsightBriefs({
    upsaResults,
    pbdRecords,
    interventions: interventionData.entries,
    selectedSubject: subject ?? null,
    selectedYear,
    selectedClass,
  });
  const selectedBrief = subject ? selectDialogInsightBrief(briefs, subject) : null;
  const overview = buildDialogInsightOverview(allBriefs);
  const subjects = allBriefs.map((brief) => brief.subjectCode);
  const years = [...new Set([...pbdRecords.map((record) => record.year), ...upsaResults.map((result) => Number(result.className.match(/[1-6]/)?.[0] ?? 0))])]
    .filter(Boolean)
    .sort((a, b) => a - b);
  const classes = [...new Set([...pbdRecords.map((record) => record.className), ...upsaResults.map((result) => result.className.match(/[1-6]\s+[A-Z]+/)?.[0] ?? result.className)])]
    .sort((a, b) => a.localeCompare(b, "ms"));
  const contextQuery = `year=${selection.year}&semester=${selection.semester}`;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Dapatan Dialog Prestasi"
        title={selectedBrief ? `${selectedBrief.subjectCode}: Briefing Panitia` : "Dapatan semua subjek"}
        description={`Semester ${selection.semester} · ${selection.year} · ${selectedBrief
          ? "Evidence UPSA, PBD dan tindakan intervensi untuk perbincangan panitia."
          : "Ringkasan sekolah merentas subjek dan kelas."}`}
        icon={Telescope}
        actions={selectedBrief ? (
          <Link href={`${selectedBrief.handoffHref}${selectedBrief.handoffHref.includes("?") ? "&" : "?"}${contextQuery}`} className="inline-flex items-center gap-2 rounded-lg border border-primary-700 bg-primary-700 px-3.5 py-2 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800">
            Intervensi <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      />

      <section className="mt-6 grid gap-3 rounded-xl border border-border-default bg-surface-card p-4 shadow-card md:grid-cols-[1fr_1fr_1fr_auto]">
        <form className="contents">
          <input type="hidden" name="year" value={selection.year} />
          <input type="hidden" name="semester" value={selection.semester} />
          <label className="grid gap-1 text-sm">
            <span className="text-text-muted">Subjek</span>
            <select name="subject" defaultValue={selectedBrief?.subjectCode ?? subject ?? ""} className="rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-text-primary shadow-raised focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-500/20">
              <option value="">Semua subjek</option>
              {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-text-muted">Tahun</span>
            <select name="level" defaultValue={selectedYear ?? ""} className="rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-text-primary shadow-raised focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-500/20">
              <option value="">Semua tahun</option>
              {years.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-text-muted">Kelas</span>
            <select name="className" defaultValue={selectedClass ?? ""} className="rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-text-primary shadow-raised focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-500/20">
              <option value="">Semua kelas</option>
              {classes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button className="inline-flex items-center justify-center rounded-lg border border-primary-700 bg-primary-700 px-4 py-2 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800 w-full md:w-auto">Tapis</button>
            {(subject || selectedYear || className) ? (
              <Link href={`/insights?${contextQuery}`} className="rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-inset">Reset</Link>
            ) : null}
          </div>
        </form>
      </section>

      {selectedBrief ? <SubjectClassEvidence selectedBrief={selectedBrief} /> : <OverviewSections overview={overview} contextQuery={contextQuery} />}

      {selectedBrief ? (
        <>
          <section className="mt-6 rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary-600">Agenda Ringkas Panitia</p>
                <ol className="mt-3 grid gap-2 text-sm text-text-secondary md:grid-cols-4">
                  {["Dapatan utama", "Kelas perlu perhatian", "Murid sasaran", "Tindakan intervensi"].map((item, index) => (
                    <li key={item} className="rounded-lg bg-surface-inset px-3 py-2">{index + 1}. {item}</li>
                  ))}
                </ol>
              </div>
              <StatusBadge tone={confidenceTone(selectedBrief.confidence)}>{selectedBrief.confidence}</StatusBadge>
            </div>
          </section>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MetricCard label="Tahap perhatian" value={selectedBrief.attentionLevel} tone={selectedBrief.attentionLevel === "Tinggi" ? "warning" : "default"} />
            <MetricCard label="Purata UPSA" value={upsaValue(selectedBrief.metrics.upsaApplicable, selectedBrief.metrics.upsaAverage)} />
            <MetricCard label="Lulus UPSA" value={upsaPercent(selectedBrief.metrics.upsaApplicable, selectedBrief.metrics.upsaPassPercentage)} />
            <MetricCard label="PBD TP1+TP2" value={formatPercent(selectedBrief.metrics.pbdLowPercentage)} tone={selectedBrief.metrics.pbdLowPercentage >= 20 ? "warning" : "default"} />
            <MetricCard label="PBD TP5+TP6" value={formatPercent(selectedBrief.metrics.pbdHighPercentage)} />
            <MetricCard label="Murid risiko berulang" value={selectedBrief.metrics.repeatedRiskPupils} tone={selectedBrief.metrics.repeatedRiskPupils ? "warning" : "default"} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><ClipboardList className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                <div>
                  <p className="text-sm font-semibold text-primary-600">Kenapa subjek ini dipilih</p>
                  <p className="mt-2 text-sm leading-5 text-text-secondary">{selectedBrief.whySelected}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedBrief.confidenceNotes.map((note) => <StatusBadge key={note}>{note}</StatusBadge>)}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
              <h2 className="font-display font-semibold text-text-primary">Cadangan Fokus Panitia</h2>
              <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                {selectedBrief.focusSuggestions.map((item) => <li key={item} className="rounded-lg bg-surface-inset px-3 py-2">{item}</li>)}
              </ul>
            </section>
          </div>

          <section className="mt-6 rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
            <h2 className="font-display text-lg font-semibold text-text-primary">Dapatan Utama Dialog Prestasi</h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {selectedBrief.findings.map((finding) => (
                <article key={`${finding.category}-${finding.title}`} className="rounded-lg border border-border-default p-4">
                  <StatusBadge tone={findingTone(finding)}>{finding.category}</StatusBadge>
                  <h3 className="mt-3 font-semibold text-text-primary">{finding.title}</h3>
                  <p className="mt-2 text-sm leading-5 text-text-secondary">{finding.evidence}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
            <h2 className="font-display text-lg font-semibold text-text-primary">Soalan Dialog</h2>
            <ul className="mt-4 grid gap-3 lg:grid-cols-2">
              {selectedBrief.questions.map((question) => (
                <li key={question.prompt} className="rounded-lg bg-surface-inset px-4 py-3 text-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">{question.focus.toUpperCase()}:</span> {question.prompt}
                </li>
              ))}
            </ul>
          </section>

          <SummaryTable
            title="Perbandingan Kelas Mengikut Perhatian"
            headers={["Kelas", "Purata UPSA", "Lulus UPSA", "Gagal UPSA", "PBD TP1+TP2", "PBD TP5+TP6", "Intervensi", "Tindakan"]}
            rows={selectedBrief.classRows.map((row) => [
              row.className,
              upsaValue(row.upsaApplicable, row.upsaAverage),
              upsaPercent(row.upsaApplicable, row.upsaPassPercentage),
              row.upsaFailCount,
              `${formatPercent(row.pbdLowPercentage)} (${row.pbdLowCount})`,
              `${formatPercent(row.pbdHighPercentage)} (${row.pbdHighCount})`,
              row.interventionCount,
              <Link key={`${row.className}-handoff`} href={`/intervensi?subject=${encodeURIComponent(selectedBrief.pbdSubjectCode)}&className=${encodeURIComponent(row.className)}${row.year ? `&year=${row.year}` : ""}`} className="font-semibold text-primary-700 underline transition-colors hover:text-primary-800">Buka</Link>,
            ])}
          />

          <section className="mt-6 rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
            <h2 className="font-display text-lg font-semibold text-text-primary">Ringkasan Dialog Sedia Salin</h2>
            <p className="mt-3 rounded-lg bg-surface-inset p-4 text-sm leading-6 text-text-secondary">
              Dapatan {selectedBrief.subjectCode}: tahap perhatian {selectedBrief.attentionLevel.toLowerCase()}. {selectedBrief.metrics.upsaApplicable ? `UPSA lulus ${formatPercent(selectedBrief.metrics.upsaPassPercentage)}, ` : "PBD sahaja, "}PBD TP1+TP2 {formatPercent(selectedBrief.metrics.pbdLowPercentage)}, dan {selectedBrief.metrics.repeatedRiskPupils} murid risiko berulang. Fokus panitia: {selectedBrief.focusSuggestions.join(" ")}
            </p>
          </section>
        </>
      ) : (
        overview.subjectSummaries.length === 0 ? (
          <p className="mt-6 rounded-xl border border-border-default bg-surface-card p-5 text-sm text-text-muted shadow-card">
            {text(language, { ms: "Tiada data UPSA + PBD sepadan untuk paparan ini.", en: "No matched UPSA + PBD data is available for this view." })}
          </p>
        ) : null
      )}
    </AppShell>
  );
}

function OverviewSections({ overview, contextQuery }: { overview: DialogInsightOverview; contextQuery: string }) {
  const highSubjects = overview.subjectSummaries.filter((summary) => summary.attentionLevel === "Tinggi").length;
  const highClasses = overview.classSummaries.filter((summary) => summary.attentionScore >= 90).length;

  return (
    <>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Subjek dipadankan" value={overview.subjectSummaries.length} />
        <MetricCard label="Kelas dipadankan" value={overview.classSummaries.length} />
        <MetricCard label="Subjek perhatian tinggi" value={highSubjects} tone={highSubjects ? "warning" : "success"} />
        <MetricCard label="Kelas perhatian tinggi" value={highClasses} tone={highClasses ? "warning" : "success"} />
      </div>

      <section className="mt-6 rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-text-primary">Dapatan Utama Semua Subjek</h2>
            <p className="mt-1 text-sm text-text-muted">Satu dapatan ringkas bagi setiap subjek, disusun mengikut tahap perhatian.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {overview.subjectSummaries.map((summary) => (
            <article key={summary.subjectCode} className="rounded-lg border border-border-default p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={summary.attentionLevel === "Tinggi" ? "warning" : summary.attentionLevel === "Pantau" ? "success" : "default"}>
                  {summary.attentionLevel}
                </StatusBadge>
                <StatusBadge>{summary.category}</StatusBadge>
              </div>
              <h3 className="mt-3 font-semibold text-text-primary">{summary.subjectCode}</h3>
              <p className="mt-2 text-sm leading-5 text-text-secondary">
                {summary.upsaApplicable ? `UPSA lulus ${formatPercent(summary.upsaPassPercentage)}, ` : "PBD sahaja, "}PBD TP1+TP2 {formatPercent(summary.pbdLowPercentage)}, PBD TP5+TP6 {formatPercent(summary.pbdHighPercentage)}.
                {summary.weakestClass ? ` Kelas perhatian: ${summary.weakestClass}.` : ""}
              </p>
              <Link href={`/insights?${contextQuery}&subject=${encodeURIComponent(summary.subjectCode)}`} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary-700 bg-primary-700 px-3.5 py-2 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800">
                Buka brief panitia <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-6">
        <DialogEvidenceHeatmap
          title="Heatmap evidence kelas"
          description="Bandingkan purata UPSA, PBD tinggi, PBD rendah, dan skor perhatian bagi semua kelas."
          rows={overview.classSummaries.map((summary) => ({
            label: summary.className,
            cells: [
              { label: "Purata UPSA", value: summary.upsaApplicable ? summary.upsaAverage : null, display: upsaValue(summary.upsaApplicable, summary.upsaAverage), tone: summary.upsaApplicable ? "high-good" as const : "neutral" as const },
              { label: "PBD TP5+TP6", value: summary.pbdHighPercentage, display: formatPercent(summary.pbdHighPercentage), tone: "high-good" as const },
              { label: "PBD TP1+TP2", value: summary.pbdLowPercentage, display: formatPercent(summary.pbdLowPercentage), tone: "low-good" as const },
              { label: "Perhatian", value: summary.attentionScore, display: String(summary.attentionScore), tone: "attention" as const },
            ],
          }))}
        />
      </div>

      <div className="mt-6 grid gap-6">
        <DialogEvidenceMatrix
          title="Matriks Evidence Subjek"
          description="Susunan mengikut skor perhatian, dengan bar ringkas untuk UPSA dan PBD."
          rows={overview.subjectSummaries.map((summary) => ({
            key: summary.subjectCode,
            label: summary.subjectCode,
            subtitle: summary.weakestClass ? `Kelas perhatian: ${summary.weakestClass}` : summary.subjectName,
            badges: [
              { label: attentionTag(summary.attentionScore), tone: attentionTone(summary.attentionScore) },
              { label: summary.category },
              ...(summary.upsaApplicable ? [] : [{ label: "PBD sahaja", tone: "default" as const }]),
            ],
            metrics: [
              { label: "UPSA lulus", value: summary.upsaApplicable ? summary.upsaPassPercentage : null, display: upsaPercent(summary.upsaApplicable, summary.upsaPassPercentage), tone: "high-good" as const },
              { label: "PBD TP5+TP6", value: summary.pbdHighPercentage, display: `${formatPercent(summary.pbdHighPercentage)} (${summary.pbdHighCount})`, tone: "high-good" as const },
              { label: "PBD TP1+TP2", value: summary.pbdLowPercentage, display: `${formatPercent(summary.pbdLowPercentage)} (${summary.pbdLowCount})`, tone: "low-good" as const },
              { label: "Perhatian", value: summary.attentionScore, display: String(summary.attentionScore), tone: "attention" as const },
            ],
            action: { href: `/insights?${contextQuery}&subject=${encodeURIComponent(summary.subjectCode)}`, label: "Buka brief" },
          }))}
        />
        <DialogEvidenceMatrix
          title="Matriks Risiko Subjek"
          description="Fokus kepada PBD rendah, jurang UPSA/PBD dan tindakan panitia."
          rows={overview.subjectSummaries.map((summary) => ({
            key: `risk-${summary.subjectCode}`,
            label: summary.subjectCode,
            subtitle: summary.confidence,
            badges: [
              { label: attentionTag(summary.attentionScore), tone: attentionTone(summary.attentionScore) },
              ...(summary.upsaApplicable ? [] : [{ label: "PBD sahaja", tone: "default" as const }]),
            ],
            metrics: [
              { label: "PBD TP1+TP2", value: summary.pbdLowPercentage, display: `${formatPercent(summary.pbdLowPercentage)} (${summary.pbdLowCount})`, tone: "low-good" as const },
              { label: "PBD TP5+TP6", value: summary.pbdHighPercentage, display: `${formatPercent(summary.pbdHighPercentage)} (${summary.pbdHighCount})`, tone: "high-good" as const },
              { label: "UPSA lulus", value: summary.upsaApplicable ? summary.upsaPassPercentage : null, display: upsaPercent(summary.upsaApplicable, summary.upsaPassPercentage), tone: "high-good" as const },
              { label: "Perhatian", value: summary.attentionScore, display: String(summary.attentionScore), tone: "attention" as const },
            ],
            action: { href: summary.handoffHref, label: "Intervensi" },
          }))}
        />
      </div>

      <div className="mt-6">
        <DialogEvidenceMatrix
          title="Matriks Evidence Kelas"
          description="Semua kelas disusun mengikut skor perhatian; Tahun 1-3 dipaparkan sebagai PBD sahaja."
          rows={overview.classSummaries.map((summary) => ({
            key: summary.className,
            label: summary.className,
            subtitle: `${summary.subjectsAtRisk} subjek risiko${summary.weakestSubjects.length ? `: ${summary.weakestSubjects.join(", ")}` : ""}`,
            badges: [
              { label: attentionTag(summary.attentionScore), tone: attentionTone(summary.attentionScore) },
              ...(summary.upsaApplicable ? [] : [{ label: "PBD sahaja", tone: "default" as const }]),
            ],
            metrics: [
              { label: "Purata UPSA", value: summary.upsaApplicable ? summary.upsaAverage : null, display: upsaValue(summary.upsaApplicable, summary.upsaAverage), tone: "high-good" as const },
              { label: "PBD TP5+TP6", value: summary.pbdHighPercentage, display: `${formatPercent(summary.pbdHighPercentage)} (${summary.pbdHighCount})`, tone: "high-good" as const },
              { label: "PBD TP1+TP2", value: summary.pbdLowPercentage, display: `${formatPercent(summary.pbdLowPercentage)} (${summary.pbdLowCount})`, tone: "low-good" as const },
              { label: "Perhatian", value: summary.attentionScore, display: String(summary.attentionScore), tone: "attention" as const },
            ],
          }))}
        />
      </div>

      <SummaryTable
        title="Ringkasan Semua Subjek"
        headers={["Subjek", "Kategori", "Lulus UPSA", "PBD TP1+TP2", "PBD TP5+TP6", "Keyakinan", "Kelas perhatian", "Tindakan"]}
        rows={overview.subjectSummaries.map((summary) => [
          summary.subjectCode,
          summary.category,
          upsaPercent(summary.upsaApplicable, summary.upsaPassPercentage),
          `${formatPercent(summary.pbdLowPercentage)} (${summary.pbdLowCount})`,
          `${formatPercent(summary.pbdHighPercentage)} (${summary.pbdHighCount})`,
          summary.confidence,
          summary.weakestClass ?? "-",
          <Link key={`${summary.subjectCode}-brief`} href={`/insights?${contextQuery}&subject=${encodeURIComponent(summary.subjectCode)}`} className="font-semibold text-primary-700 underline transition-colors hover:text-primary-800">Brief</Link>,
        ])}
      />

      <SummaryTable
        title="Ringkasan Semua Kelas"
        headers={["Kelas", "Purata UPSA", "Lulus UPSA", "PBD TP1+TP2", "PBD TP5+TP6", "Subjek risiko", "Subjek utama"]}
        rows={overview.classSummaries.map((summary) => [
          summary.className,
          upsaValue(summary.upsaApplicable, summary.upsaAverage),
          upsaPercent(summary.upsaApplicable, summary.upsaPassPercentage),
          `${formatPercent(summary.pbdLowPercentage)} (${summary.pbdLowCount})`,
          `${formatPercent(summary.pbdHighPercentage)} (${summary.pbdHighCount})`,
          summary.subjectsAtRisk,
          summary.weakestSubjects.join(", ") || "-",
        ])}
      />
    </>
  );
}

function SubjectClassEvidence({ selectedBrief }: { selectedBrief: DialogInsightBrief }) {
  return (
    <>
      <div className="mt-6">
        <DialogEvidenceHeatmap
          title={`Heatmap evidence kelas ${selectedBrief.subjectCode}`}
          description="Bandingkan UPSA/PBD setiap kelas untuk subjek dipilih."
          rows={selectedBrief.classRows.map((row) => ({
            label: row.className,
            cells: [
              { label: "Purata UPSA", value: row.upsaApplicable ? row.upsaAverage : null, display: upsaValue(row.upsaApplicable, row.upsaAverage), tone: row.upsaApplicable ? "high-good" as const : "neutral" as const },
              { label: "PBD TP5+TP6", value: row.pbdHighPercentage, display: formatPercent(row.pbdHighPercentage), tone: "high-good" as const },
              { label: "PBD TP1+TP2", value: row.pbdLowPercentage, display: formatPercent(row.pbdLowPercentage), tone: "low-good" as const },
              { label: "Perhatian", value: row.attentionScore, display: String(row.attentionScore), tone: "attention" as const },
            ],
          }))}
        />
      </div>

      <div className="mt-6">
        <DialogEvidenceMatrix
          title={`Matriks Evidence Kelas ${selectedBrief.subjectCode}`}
          description="Kelas disusun mengikut skor perhatian untuk memulakan perbincangan panitia."
          rows={selectedBrief.classRows.map((row) => ({
            key: row.className,
            label: row.className,
            subtitle: row.upsaApplicable ? `${row.upsaFailCount} gagal UPSA, ${row.interventionCount} intervensi` : `${row.interventionCount} intervensi, UPSA/UASA tidak berkaitan`,
            badges: [
              { label: attentionTag(row.attentionScore), tone: attentionTone(row.attentionScore) },
              ...(row.upsaApplicable ? [] : [{ label: "PBD sahaja", tone: "default" as const }]),
            ],
            metrics: [
              { label: "Purata UPSA", value: row.upsaApplicable ? row.upsaAverage : null, display: upsaValue(row.upsaApplicable, row.upsaAverage), tone: "high-good" as const },
              { label: "PBD TP5+TP6", value: row.pbdHighPercentage, display: `${formatPercent(row.pbdHighPercentage)} (${row.pbdHighCount})`, tone: "high-good" as const },
              { label: "PBD TP1+TP2", value: row.pbdLowPercentage, display: `${formatPercent(row.pbdLowPercentage)} (${row.pbdLowCount})`, tone: "low-good" as const },
              { label: "Perhatian", value: row.attentionScore, display: String(row.attentionScore), tone: "attention" as const },
            ],
            action: { href: `/intervensi?subject=${encodeURIComponent(selectedBrief.pbdSubjectCode)}&className=${encodeURIComponent(row.className)}${row.year ? `&year=${row.year}` : ""}`, label: "Intervensi" },
          }))}
        />
      </div>

      <SummaryTable
        title="Ringkasan Semua Kelas"
        headers={["Kelas", "Purata UPSA", "Lulus UPSA", "Gagal UPSA", "PBD TP1+TP2", "PBD TP5+TP6", "Intervensi", "Tindakan"]}
        rows={selectedBrief.classRows.map((row) => [
          row.className,
          upsaValue(row.upsaApplicable, row.upsaAverage),
          upsaPercent(row.upsaApplicable, row.upsaPassPercentage),
          row.upsaApplicable ? row.upsaFailCount : "N/A",
          `${formatPercent(row.pbdLowPercentage)} (${row.pbdLowCount})`,
          `${formatPercent(row.pbdHighPercentage)} (${row.pbdHighCount})`,
          row.interventionCount,
          <Link key={`${row.className}-handoff-top`} href={`/intervensi?subject=${encodeURIComponent(selectedBrief.pbdSubjectCode)}&className=${encodeURIComponent(row.className)}${row.year ? `&year=${row.year}` : ""}`} className="font-semibold text-primary-700 underline transition-colors hover:text-primary-800">Buka</Link>,
        ])}
      />
    </>
  );
}

function SummaryTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-card">
      <div className="border-b border-border-default px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
      </div>
      {rows.length === 0 ? <p className="px-5 py-4 text-sm text-text-muted">Tiada kelas sepadan untuk tapisan semasa.</p> : null}
      <div className="overflow-x-auto">
        <table className="min-w-[58rem] w-full text-sm">
          <thead>
            <tr>
              {headers.map((header) => <th key={header} className="whitespace-nowrap border-b border-border-default bg-surface-inset px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row[0])} className="border-b border-border-default transition-colors last:border-b-0 hover:bg-surface-inset/60">
                {row.map((cell, index) => (
                  <td key={`${String(row[0])}-${headers[index]}`} className={`px-4 py-3 ${index === 0 ? "font-medium text-text-primary" : "text-text-secondary"}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
