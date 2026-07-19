import Link from "next/link";
import { AlertCircle, ArrowUpRight, CheckCircle2, CircleDashed, ClipboardList, Settings2 } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireActorContext } from "@/lib/auth/actor";
import { assessmentPath, createPlaceholderAssessmentPeriod, listPeriodYears, resolveAssessmentPeriod } from "@/lib/config/periods";
import { getDatabasePbdSetup, type DatabasePbdSetup } from "@/lib/db/pbd";
import { resolveDashboardSelection, summarizeDashboardPbd } from "@/lib/pbd/dashboardSummary";

type Semester = "1" | "2";

function semesterHref(year: string, semester: Semester) {
  return `/dashboard?year=${year}&semester=${semester}`;
}

function Metric({ value, label, tone = "default" }: { value: number; label: string; tone?: "default" | "warning" | "success" }) {
  const valueClass = tone === "warning" ? "text-amber-800" : tone === "success" ? "text-teal-800" : "text-slate-950";
  return <div className="min-w-0"><p className={`text-2xl font-semibold tabular-nums ${valueClass}`}>{value}</p><p className="mt-1 text-sm leading-5 text-slate-600">{label}</p></div>;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; semester?: string }>;
}) {
  const query = await searchParams;
  const context = await requireActorContext();
  const school = context.school;
  const availableYears = listPeriodYears(school.assessmentPeriods, school.pbdPeriods);
  const { year: selectedYear, semester } = resolveDashboardSelection({
    availableYears,
    pbdPeriods: school.pbdPeriods,
    requestedYear: query.year,
    requestedSemester: query.semester,
    defaultPbdYear: school.defaultPbdPeriod?.year,
    defaultAssessmentYear: school.defaultUpsaPeriod?.year,
  });
  const canManagePbd = context.actor.role === "school_admin" || context.actor.role === "platform_admin";
  const upsaPeriod = resolveAssessmentPeriod(school.assessmentPeriods, selectedYear, "upsa") ?? createPlaceholderAssessmentPeriod(selectedYear, "upsa");
  const uasaPeriod = resolveAssessmentPeriod(school.assessmentPeriods, selectedYear, "uasa") ?? createPlaceholderAssessmentPeriod(selectedYear, "uasa");

  let setup: DatabasePbdSetup | null = null;
  let databaseError = false;
  try {
    setup = await getDatabasePbdSetup(context, selectedYear, semester);
  } catch (error) {
    databaseError = true;
    console.error("dashboard_pbd_load_failed", { schoolId: school.id, year: selectedYear, semester, error });
  }
  const summary = setup ? summarizeDashboardPbd(setup) : null;
  const setupIncomplete = !summary || summary.activeClasses === 0 || summary.activeSubjects === 0 || summary.assignments === 0;
  const entryHref = `/pbd/entry?year=${selectedYear}&semester=${semester}`;
  const setupHref = `/school/setup?year=${selectedYear}&semester=${semester}&view=classes`;

  return (
    <AppShell>
      <PageHeader
        eyebrow={`Tahun ${selectedYear}`}
        title="Operasi PBD"
        description={school.name}
        actions={canManagePbd ? <Link href={entryHref} className="action-primary">Isi Rumusan TP</Link> : null}
      />

      <div className="mt-6 flex min-w-0 flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2" aria-label="Pilih semester">
          {(["1", "2"] as const).map((value) => (
            <Link
              key={value}
              href={semesterHref(selectedYear, value)}
              aria-current={semester === value ? "page" : undefined}
              style={semester === value ? { color: "#ffffff" } : undefined}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${semester === value ? "bg-stone-800 text-white" : "text-slate-600 hover:bg-stone-200 hover:text-slate-950"}`}
            >
              Semester {value}
            </Link>
          ))}
        </div>
        <p className="text-sm text-slate-600">Kemajuan dikira daripada rekod yang telah dimuktamadkan.</p>
      </div>

      {databaseError ? (
        <section className="mt-6 rounded-lg bg-rose-50 p-5 text-rose-950" role="alert">
          <div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><h2 className="font-semibold">Kemajuan PBD tidak dapat dimuatkan</h2><p className="mt-1 text-sm">Cuba muatkan semula halaman ini. Data sekolah anda tidak diubah.</p></div></div>
        </section>
      ) : setupIncomplete ? (
        <section className="mt-6 rounded-lg bg-white p-6 sm:p-8">
          <div className="max-w-2xl">
            <Settings2 className="h-6 w-6 text-teal-800" />
            <h2 className="mt-4 text-xl font-semibold text-slate-950">Lengkapkan Setup PBD</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Sediakan kelas aktif, subjek dan tetapan subjek kepada kelas sebelum kemajuan pengisian boleh dipaparkan.</p>
            {canManagePbd ? <Link href={setupHref} className="action-primary mt-5">Buka Setup PBD</Link> : <p className="mt-4 text-sm font-medium text-slate-800">Hubungi pentadbir sekolah untuk melengkapkan setup.</p>}
          </div>
        </section>
      ) : summary ? (
        <section className="mt-6 overflow-hidden rounded-lg bg-white">
          <div className="p-5 sm:p-7">
            <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-teal-800">Kemajuan Semester {semester}</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {summary.final} <span className="text-2xl font-medium text-slate-500 sm:text-3xl">daripada {summary.assignments}</span>
                </p>
                <p className="mt-2 text-sm text-slate-600">tetapan kelas-subjek telah dimuktamadkan</p>
              </div>
              <p className="text-3xl font-semibold tabular-nums text-teal-800">{summary.finalizedPercentage.toFixed(1)}%</p>
            </div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-label="Kemajuan PBD dimuktamadkan" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(summary.finalizedPercentage)}>
              <div className="h-full rounded-full bg-teal-800" style={{ width: `${summary.finalizedPercentage}%` }} />
            </div>
            <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-4">
              <Metric value={summary.empty} label="Belum diisi" />
              <Metric value={summary.mismatch} label="Tidak sepadan" tone="warning" />
              <Metric value={summary.ready} label="Sedia dimuktamadkan" />
              <Metric value={summary.final} label="Muktamad" tone="success" />
            </div>
          </div>
          <div className="bg-stone-100 px-5 py-4 sm:px-7">
            <dl className="grid grid-cols-3 gap-4 text-sm">
              <div><dt className="text-slate-600">Kelas aktif</dt><dd className="mt-1 font-semibold tabular-nums text-slate-950">{summary.activeClasses}</dd></div>
              <div><dt className="text-slate-600">Subjek aktif</dt><dd className="mt-1 font-semibold tabular-nums text-slate-950">{summary.activeSubjects}</dd></div>
              <div><dt className="text-slate-600">Tetapan aktif</dt><dd className="mt-1 font-semibold tabular-nums text-slate-950">{summary.assignments}</dd></div>
            </dl>
          </div>
        </section>
      ) : null}

      {!setupIncomplete && summary ? (
        <section className="mt-8">
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-xl font-semibold text-slate-950">Perlu tindakan</h2><p className="mt-1 text-sm text-slate-600">Subjek dengan kelas yang belum selesai, disusun mengikut keutamaan.</p></div>
            {canManagePbd ? <Link href={setupHref} className="text-sm font-medium text-teal-800 hover:text-teal-950">Urus kelas dan subjek</Link> : null}
          </div>
          {summary.subjectsNeedingAction.length ? (
            <div className="mt-4 overflow-hidden rounded-lg bg-white">
              {summary.subjectsNeedingAction.map((subject) => {
                const content = <>
                  <div className="min-w-0"><h3 className="break-words font-semibold text-slate-950">{subject.code} · {subject.name}</h3><p className="mt-1 text-sm text-slate-600">{subject.assignments} kelas ditetapkan</p></div>
                  <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    {subject.mismatch ? <span className="flex items-center gap-1.5 font-medium text-amber-800"><AlertCircle className="h-4 w-4" />{subject.mismatch} tidak sepadan</span> : null}
                    {subject.ready ? <span className="flex items-center gap-1.5 text-slate-700"><CheckCircle2 className="h-4 w-4" />{subject.ready} sedia</span> : null}
                    {subject.empty ? <span className="flex items-center gap-1.5 text-slate-700"><CircleDashed className="h-4 w-4" />{subject.empty} belum diisi</span> : null}
                    {canManagePbd ? <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" /> : null}
                  </div>
                </>;
                return canManagePbd ? (
                  <Link key={subject.id} href={`/pbd/entry?year=${selectedYear}&semester=${semester}&subjectId=${subject.id}`} className="group flex min-w-0 flex-col gap-3 px-5 py-4 transition-colors hover:bg-stone-100 sm:flex-row sm:items-center sm:justify-between sm:px-6">{content}</Link>
                ) : (
                  <article key={subject.id} className="flex min-w-0 flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">{content}</article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-3 rounded-lg bg-white p-5"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-800" /><div><h3 className="font-semibold">Semua rekod selesai</h3><p className="mt-1 text-sm text-slate-600">Semua tetapan kelas-subjek aktif telah dimuktamadkan.</p></div></div>
          )}
        </section>
      ) : null}

      <nav aria-label="Pentaksiran lain" className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-600">
        <span className="flex items-center gap-2 font-medium text-slate-800"><ClipboardList className="h-4 w-4" />Pentaksiran lain</span>
        <Link href={assessmentPath(upsaPeriod, "/classes")} className="hover:text-slate-950">UPSA</Link>
        <Link href={assessmentPath(uasaPeriod, "/classes")} className="hover:text-slate-950">UASA</Link>
        <Link href={`/pbd/periods/${selectedYear}?semester=${semester}`} className="hover:text-slate-950">Analisis PBD</Link>
      </nav>
    </AppShell>
  );
}
