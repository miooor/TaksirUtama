import { BarChart3, Download, FileText, HeartHandshake, Presentation } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { requireActorContext } from "@/lib/auth/actor";
import { createPlaceholderAssessmentPeriod, listPeriodYears, resolveAssessmentPeriod, resolvePbdPeriod } from "@/lib/config/periods";
import { isDatabaseConfigured } from "@/lib/db/client";
import { resolveAssessmentSubjectCode } from "@/lib/insights/subjectMatching";
import { getAllPbdInterventions, listPbdSubjectTabs } from "@/lib/pbd/data";
import { getAllAssessmentClassResultsHybrid } from "@/lib/upsa/data";
import { getLanguage, text } from "@/lib/i18n";
import { interventionPupilKey } from "@/lib/pbd/intervention";
import { resolveInterventionQueryContext } from "@/lib/pbd/interventionContext";

const subjectNames: Record<string, string> = {
  BM: "Bahasa Melayu",
  BI: "Bahasa Inggeris",
  MATE: "Matematik",
  SAINS: "Sains",
  SEJARAH: "Sejarah",
  "P.ISLAM": "Pendidikan Islam",
  "P.MORAL": "Pendidikan Moral",
  PJK: "Pendidikan Jasmani dan Kesihatan",
  PSV: "Pendidikan Seni Visual",
  MUZIK: "Pendidikan Muzik",
  RBT: "Reka Bentuk dan Teknologi",
  "B.ARAB": "Bahasa Arab",
  "B.CHINA": "Bahasa Cina",
  "B.TAMIL": "Bahasa Tamil",
};

export default async function DialogPrestasiPage({ searchParams }: { searchParams: Promise<{ year?: string; semester?: string; assessment?: string }> }) {
  const language = await getLanguage();
  const context = await requireActorContext();
  const school = context.school;
  const { assessmentPeriods, defaultPbdPeriod, pbdPeriods } = school;
  const params = await searchParams;
  const requestedYear = params.year;
  const assessment = params.assessment === "uasa" ? "uasa" : "upsa";
  const assessmentLabel = assessment.toUpperCase();
  const years = listPeriodYears(assessmentPeriods, pbdPeriods);
  const year = requestedYear && years.includes(requestedYear) ? requestedYear : defaultPbdPeriod?.year ?? years[0] ?? "2026";
  const selection = resolveInterventionQueryContext(school, { year, semester: params.semester });
  const pbdPeriod = resolvePbdPeriod(pbdPeriods, year) ? selection.period : null;
  // In database-primary mode a school may have assessment_results rows without
  // a workbook-backed assessment period; fall back to a placeholder period so
  // the assessment comparison is still built from the database (mirrors the
  // insights and assessment-page paths).
  const assessmentPeriod = resolveAssessmentPeriod(assessmentPeriods, year, assessment)
    ?? (isDatabaseConfigured() ? createPlaceholderAssessmentPeriod(year, assessment) : null);

  if (!pbdPeriod) {
    return (
      <AppShell>
        <PageHeader eyebrow="DP" title="Dialog Prestasi Ketua Panitia" description={`Data PBD ${year} tidak tersedia.`} icon={Presentation} />
      </AppShell>
    );
  }

  const [subjects, interventionData, assessmentResults] = await Promise.all([
    listPbdSubjectTabs(school, pbdPeriod),
    getAllPbdInterventions(school, pbdPeriod),
    assessmentPeriod ? getAllAssessmentClassResultsHybrid(context, assessmentPeriod).catch(() => []) : Promise.resolve([]),
  ]);
  const assessmentCodes = new Set(assessmentResults.flatMap((result) => result.students.flatMap((student) => student.subjects.map((subject) => subject.subjectCode))));
  const sortedSubjects = [...subjects].sort((a, b) => a.localeCompare(b, "ms"));

  return (
    <AppShell>
      <PageHeader
        eyebrow={`DP ${year}`}
        title={text(language, { ms: "Pusat Muat Turun Dialog Prestasi Ketua Panitia", en: "Subject Head Dialog Prestasi Download Centre" })}
        description={`Semester ${selection.semester} · ${text(language, { ms: "Pilih subjek dan muat turun dokumen Dialog Prestasi.", en: "Choose a subject and download the Dialog Prestasi documents." })}`}
        icon={Presentation}
        actions={<StatusBadge tone="success">{sortedSubjects.length} {text(language, { ms: "subjek", en: "subjects" })}</StatusBadge>}
      />

      <div className="mt-6">
        <Tabs
          label="Pentaksiran Dialog Prestasi"
          items={(["upsa", "uasa"] as const).map((item) => {
            const available = Boolean(resolveAssessmentPeriod(assessmentPeriods, year, item));
            return {
              key: item,
              label: <>{item.toUpperCase()}{!available ? <span className="ml-2 text-[10px] font-normal opacity-75">Belum tersedia</span> : null}</>,
              href: `/dialog-prestasi?year=${year}&semester=${selection.semester}&assessment=${item}`,
              active: assessment === item,
            };
          })}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Analisa Perbandingan TP" value={sortedSubjects.length} />
        <MetricCard label={`Analisa Perbandingan ${assessmentLabel}`} value={sortedSubjects.filter((code) => resolveAssessmentSubjectCode(code, assessmentCodes)).length} />
        <MetricCard label="Murid intervensi" value={new Set(interventionData.entries.map(interventionPupilKey)).size} tone="warning" />
      </div>

      <Alert variant="info" title="Set dokumen setiap Ketua Panitia" className="mt-6">
        1. Analisa Perbandingan TP semua tahun · 2. Analisa Perbandingan {assessmentLabel} Tahun 4, 5 dan 6 · 3. Intervensi dan Isu disusun mengikut tahun dan kelas.
      </Alert>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {sortedSubjects.map((subjectCode) => {
          const assessmentSubjectCode = resolveAssessmentSubjectCode(subjectCode, assessmentCodes);
          const interventionCount = interventionData.entries.filter((entry) => entry.subjectCode === subjectCode).length;
          const base = `/api/dialog-prestasi/${year}/subjects/${encodeURIComponent(subjectCode)}`;
          const comparisonHref = `/api/dialog-prestasi/${year}/${assessment}/subjects/${encodeURIComponent(subjectCode)}/comparison`;
          return (
            <Card key={subjectCode}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-primary-600">{subjectCode}</p>
                    <h2 className="mt-1 font-display text-lg font-semibold text-text-primary">{subjectNames[subjectCode] ?? subjectCode}</h2>
                  </div>
                  <StatusBadge tone={interventionCount ? "warning" : "success"}>{interventionCount} intervensi</StatusBadge>
                </div>

                <div className="mt-5 grid gap-3">
                  <DownloadCard
                    href={`/api/pbd/periods/${year}/reports/subjects/${encodeURIComponent(subjectCode)}/pdf?semester=${selection.semester}`}
                    icon={BarChart3}
                    title="1. Analisa Perbandingan TP"
                    description="Carta bar dan jadual perbandingan kelas bagi setiap tahun menggunakan data PBD."
                  />
                  <DownloadCard
                    href={assessmentSubjectCode && assessmentPeriod ? comparisonHref : null}
                    icon={FileText}
                    title={`2. Analisa Perbandingan ${assessmentLabel}`}
                    description={assessmentSubjectCode && assessmentPeriod ? `Carta dan jadual gred Tahun 4, 5 dan 6 (${assessmentSubjectCode}).` : `Tiada subjek ${assessmentLabel} yang sepadan atau tempoh belum tersedia.`}
                  />
                  <DownloadCard
                    href={`${base}/intervention?semester=${selection.semester}`}
                    icon={HeartHandshake}
                    title="3. Intervensi dan Isu"
                    description="Senarai murid TP1 dan TP2, masalah dan intervensi mengikut tahun serta kelas."
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}

function DownloadCard({ href, icon: Icon, title, description }: { href: string | null; icon: typeof Download; title: string; description: string }) {
  const content = (
    <>
      <span className="rounded-lg bg-primary-50 p-2 text-primary-600"><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-text-primary">{title}</span>
        <span className="mt-0.5 block text-xs leading-4 text-text-muted">{description}</span>
      </span>
      <Download className="h-4 w-4 shrink-0 text-text-disabled" />
    </>
  );
  return href ? (
    <a href={href} className="flex items-center gap-3 rounded-lg border border-border-default p-3 transition-colors hover:border-primary-300 hover:bg-primary-50/40">{content}</a>
  ) : (
    <div className="flex cursor-not-allowed items-center gap-3 rounded-lg border border-border-default bg-surface-inset p-3 opacity-60">{content}</div>
  );
}
