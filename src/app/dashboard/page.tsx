import Link from "next/link";
import { BarChart3, ClipboardCheck, FileText, GraduationCap } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { hasGoogleCredentials } from "@/lib/config/env";
import { requireSchoolContext } from "@/lib/auth";
import { assessmentPath, createPlaceholderAssessmentPeriod, createPlaceholderPbdPeriod, listPeriodYears, resolveAssessmentPeriod, resolvePbdPeriod } from "@/lib/config/periods";
import { listPbdClassesFromRecords, listPbdSubjectTabs, getAllPbdRecords } from "@/lib/pbd/data";
import { calculatePbdReadiness } from "@/lib/pbd/readiness";
import { getAllAssessmentClassResults } from "@/lib/upsa/data";
import { calculateUpsaReadiness } from "@/lib/upsa/readiness";
import { getLanguage } from "@/lib/i18n";

const copy = {
  ms: {
    refreshed: "Data telah dimuat semula.",
    refreshError: "Kata laluan muat semula tidak sah.",
    classAnalysis: "Slip dan analisis kelas",
    classes: "kelas",
    dataSource: "Sumber data",
    publicSheet: "Sheet awam",
    status: "Status",
    ready: "Sedia digunakan",
    openUpsa: "Buka UPSA",
    schoolTpAnalysis: "Analisis TP sekolah",
    dataIssues: "isu data",
    subjects: "Subjek",
    source: "Sumber",
    openPbd: "Buka PBD",
    pbdReadiness: "Kesediaan data PBD",
    upsaReadiness: "Kesediaan data UPSA",
    beforeDate: "Sebelum 21 Mei 2026",
    viewDetails: "Lihat butiran",
    complete: "Lengkap",
    incomplete: "Belum lengkap",
    completionRate: "Peratus lengkap",
    viewClasses: "Lihat kelas",
    filledCells: "Sel diisi",
    emptyCells: "Sel kosong",
    absentCells: "TH",
    workflow: "Aliran kerja guru",
    workflowDescription: "Mulakan dengan semakan data, kemudian terus ke analisis atau slip.",
    inspectData: "Semak data",
    inspectDataHelp: "Pastikan pengisian lengkap sebelum analisis rasmi digunakan.",
    analyseUpsa: "Analisis UPSA",
    analyseUpsaHelp: "Lihat kelas dan analisis seluruh tahun.",
    generateSlips: "Jana slip",
    generateSlipsHelp: "Buka kelas untuk semak atau cetak slip murid.",
    schoolOverview: "Gambaran keseluruhan sekolah",
    pupils: "Murid",
    subjectsWithIssues: "Subjek berisu",
  },
  en: {
    refreshed: "Data has been refreshed.",
    refreshError: "Invalid refresh password.",
    classAnalysis: "Class slips and analysis",
    classes: "classes",
    dataSource: "Data source",
    publicSheet: "Public sheet",
    status: "Status",
    ready: "Ready to use",
    openUpsa: "Open UPSA",
    schoolTpAnalysis: "School TP analysis",
    dataIssues: "data issues",
    subjects: "Subjects",
    source: "Source",
    openPbd: "Open PBD",
    pbdReadiness: "PBD data readiness",
    upsaReadiness: "UPSA data readiness",
    beforeDate: "Before 21 May 2026",
    viewDetails: "View details",
    complete: "Complete",
    incomplete: "Incomplete",
    completionRate: "Completion rate",
    viewClasses: "View classes",
    filledCells: "Filled cells",
    emptyCells: "Empty cells",
    absentCells: "TH",
    workflow: "Teacher workflow",
    workflowDescription: "Start with data checks, then move into analysis or slips.",
    inspectData: "Check data",
    inspectDataHelp: "Confirm entry completeness before official analysis is used.",
    analyseUpsa: "Analyse UPSA",
    analyseUpsaHelp: "Review classes and whole-year analysis.",
    generateSlips: "Generate slips",
    generateSlipsHelp: "Open a class to review or print student slips.",
    schoolOverview: "School overview",
    pupils: "Pupils",
    subjectsWithIssues: "Subjects with issues",
  },
} as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ refreshed?: string; refreshError?: string; lang?: string; year?: string }>;
}) {
  const { refreshed, refreshError, year } = await searchParams;
  const school = await requireSchoolContext();
  const { assessmentPeriods, pbdPeriods, defaultUpsaPeriod, defaultPbdPeriod } = school;
  const language = await getLanguage();
  const t = copy[language];
  const availableYears = listPeriodYears(assessmentPeriods, pbdPeriods);
  const selectedYear = year && availableYears.includes(year) ? year : defaultUpsaPeriod?.year ?? defaultPbdPeriod?.year ?? availableYears[0] ?? "2026";
  const upsaPeriod = resolveAssessmentPeriod(assessmentPeriods, selectedYear, "upsa") ?? createPlaceholderAssessmentPeriod(selectedYear, "upsa");
  const pbdPeriod = resolvePbdPeriod(pbdPeriods, selectedYear) ?? createPlaceholderPbdPeriod(selectedYear);
  const upsaHref = assessmentPath(upsaPeriod, "/classes");
  const pbdHref = `/pbd/periods/${pbdPeriod.year}`;
  const [upsaLoad, pbdSubjectsLoad, pbdRecordsLoad] = await Promise.all([
    upsaPeriod.spreadsheetId ? getAllAssessmentClassResults(school, upsaPeriod).then((data) => ({ data, error: null })).catch((error: Error) => ({ data: [], error })) : Promise.resolve({ data: [], error: new Error("UPSA belum dikonfigurasi") }),
    pbdPeriod.spreadsheetId ? listPbdSubjectTabs(school, pbdPeriod).then((data) => ({ data, error: null })).catch((error: Error) => ({ data: [], error })) : Promise.resolve({ data: [], error: new Error("PBD belum dikonfigurasi") }),
    pbdPeriod.spreadsheetId ? getAllPbdRecords(school, pbdPeriod).then((data) => ({ data, error: null })).catch((error: Error) => ({ data: [], error })) : Promise.resolve({ data: [], error: new Error("PBD belum dikonfigurasi") }),
  ]);
  const upsaResults = upsaLoad.data;
  const pbdSubjects = pbdSubjectsLoad.data;
  const pbdRecords = pbdRecordsLoad.data;
  const hasDataError = Boolean(upsaLoad.error || pbdSubjectsLoad.error || pbdRecordsLoad.error);
  const upsaClasses = upsaResults.map((result) => result.className);
  const pbdClasses = listPbdClassesFromRecords(pbdRecords);
  const upsaReadiness = calculateUpsaReadiness(upsaResults);
  const upsaPupilCount = upsaResults.reduce((sum, result) => sum + result.students.length, 0);
  const pbdIncomplete = pbdRecords.filter((record) => record.dataIssues.length > 0).length;
  const readiness = calculatePbdReadiness(pbdRecords);

  return (
    <AppShell>
      <PageHeader eyebrow="Dashboard" title={school.systemName} description={school.name} />

      {refreshed ? <p className="mt-4 text-sm font-medium text-teal-700">{t.refreshed}</p> : null}
      {refreshError ? <p className="mt-4 text-sm font-medium text-rose-700">{t.refreshError}</p> : null}
      {hasDataError ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
          <span>Data sekolah belum sedia sepenuhnya. Analisis yang terjejas telah dikunci.</span>
          <Link href="/readiness" className="font-semibold">Lihat semakan data</Link>
        </div>
      ) : null}

      <section className="mt-6 rounded-lg border bg-white p-5">
        <div>
          <p className="text-sm font-medium text-teal-700">{t.workflow}</p>
          <h2 className="mt-1 text-lg font-semibold">{t.workflowDescription}</h2>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ClipboardCheck,
              title: t.inspectData,
              help: t.inspectDataHelp,
              href: "/readiness",
              action: t.viewDetails,
            },
            {
              icon: BarChart3,
              title: t.analyseUpsa,
              help: t.analyseUpsaHelp,
              href: upsaHref,
              action: t.openUpsa,
            },
            {
              icon: FileText,
              title: t.generateSlips,
              help: t.generateSlipsHelp,
              href: upsaHref,
              action: t.viewClasses,
            },
          ].map(({ icon: Icon, title, help, href, action }) => (
            <article key={title} className="rounded-lg border bg-slate-50 p-4">
              <Icon className="h-5 w-5 text-teal-700" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 min-h-10 text-sm text-slate-600">{help}</p>
              <Link href={href} className="action-neutral mt-4 text-sm">
                {action}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-lg border bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-teal-700">{t.schoolOverview}</p>
              <h2 className="mt-1 text-xl font-semibold">UPSA</h2>
            </div>
            <StatusBadge tone={upsaLoad.error ? "warning" : "success"}>{upsaLoad.error ? t.incomplete : `${upsaClasses.length} ${t.classes}`}</StatusBadge>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-slate-500">{t.dataSource}</dt><dd className="mt-1 font-medium">{hasGoogleCredentials ? "Google API" : t.publicSheet}</dd></div>
            <div><dt className="text-slate-500">{t.status}</dt><dd className="mt-1 font-medium">{t.ready}</dd></div>
            <div><dt className="text-slate-500">{t.pupils}</dt><dd className="mt-1 font-medium">{upsaPupilCount}</dd></div>
            <div><dt className="text-slate-500">{t.completionRate}</dt><dd className="mt-1 font-medium">{upsaReadiness.completionPercentage.toFixed(1)}%</dd></div>
          </dl>
          <div className="mt-5 flex gap-2 text-sm">
            <Link href={upsaHref} className="action-primary">{t.openUpsa}</Link>
          </div>
        </section>

        <section className="rounded-lg border bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <GraduationCap className="h-4 w-4" />
                <span>PBD</span>
              </div>
              <h2 className="mt-1 text-xl font-semibold">{t.schoolTpAnalysis}</h2>
            </div>
            <StatusBadge tone={pbdRecordsLoad.error ? "warning" : pbdIncomplete ? "warning" : "success"}>{pbdRecordsLoad.error ? t.incomplete : `${pbdIncomplete} ${t.dataIssues}`}</StatusBadge>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
            <div><dt className="text-slate-500">{t.subjects}</dt><dd className="mt-1 font-medium">{pbdSubjects.length}</dd></div>
            <div><dt className="text-slate-500">{language === "en" ? "Classes" : "Kelas"}</dt><dd className="mt-1 font-medium">{pbdClasses.length}</dd></div>
            <div><dt className="text-slate-500">{t.subjectsWithIssues}</dt><dd className="mt-1 font-medium">{readiness.incompleteSubjects.length}</dd></div>
          </dl>
          <div className="mt-5 flex gap-2 text-sm">
            <Link href={pbdHref} className="action-accent">{t.openPbd}</Link>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-teal-700">{t.pbdReadiness}</p>
              <h2 className="mt-1 text-lg font-semibold">{t.beforeDate}</h2>
            </div>
            <Link href={pbdHref} className="action-primary text-sm">{t.viewDetails}</Link>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div><p className="text-sm text-slate-500">{t.complete}</p><p className="mt-1 text-2xl font-semibold">{readiness.completeRecords}</p></div>
            <div><p className="text-sm text-slate-500">{t.incomplete}</p><p className="mt-1 text-2xl font-semibold text-amber-700">{readiness.incompleteRecords}</p></div>
            <div><p className="text-sm text-slate-500">{t.completionRate}</p><p className="mt-1 text-2xl font-semibold">{readiness.completionPercentage.toFixed(1)}%</p></div>
          </div>
        </section>
        <section className="rounded-lg border bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-teal-700">{t.upsaReadiness}</p>
              <h2 className="mt-1 text-lg font-semibold">{t.beforeDate}</h2>
            </div>
            <Link href={upsaHref} className="action-primary text-sm">{t.viewClasses}</Link>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div><p className="text-sm text-slate-500">{t.filledCells}</p><p className="mt-1 text-2xl font-semibold">{upsaReadiness.enteredCells}</p></div>
            <div><p className="text-sm text-slate-500">{t.emptyCells}</p><p className="mt-1 text-2xl font-semibold text-amber-700">{upsaReadiness.missingCells}</p></div>
            <div><p className="text-sm text-slate-500">{t.absentCells}</p><p className="mt-1 text-2xl font-semibold">{upsaReadiness.absentCells}</p></div>
            <div><p className="text-sm text-slate-500">{t.completionRate}</p><p className="mt-1 text-2xl font-semibold">{upsaReadiness.completionPercentage.toFixed(1)}%</p></div>
          </div>
        </section>
      </div>

    </AppShell>
  );
}
