import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  FileWarning,
  Lightbulb,
  PenLine,
  PieChart,
  Presentation,
  Settings2,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs } from "@/components/ui/tabs";
import { requireActorContext } from "@/lib/auth/actor";
import { assessmentPath, createPlaceholderAssessmentPeriod, listPeriodYears, resolveAssessmentPeriod } from "@/lib/config/periods";
import { getDatabasePbdSetup, type DatabasePbdSetup } from "@/lib/db/pbd";
import { resolveDashboardSelection, summarizeDashboardPbd } from "@/lib/pbd/dashboardSummary";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getAssessmentEntryProgress } from "@/lib/db/assessmentEntry";

type Semester = "1" | "2";
type QueueMode = "subject" | "class";

function semesterHref(year: string, semester: Semester) {
  return `/dashboard?year=${year}&semester=${semester}`;
}

function queueHref(year: string, semester: Semester, queue: QueueMode) {
  return `/dashboard?year=${year}&semester=${semester}&queue=${queue}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; semester?: string; queue?: string }>;
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
  const queue: QueueMode = query.queue === "class" ? "class" : "subject";
  const canManagePbd = context.actor.role === "school_admin" || context.actor.role === "platform_admin";
  const canEnterPbd = canManagePbd || context.actor.role === "teacher";
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
        actions={canEnterPbd ? <Button href={entryHref} icon={PenLine}>Isi Rumusan TP</Button> : null}
      />

      <div className="mt-6 flex min-w-0 flex-wrap items-center justify-between gap-4">
        <Tabs
          label="Pilih semester"
          items={(["1", "2"] as const).map((value) => ({
            key: value,
            label: `Semester ${value}`,
            href: semesterHref(selectedYear, value),
            active: semester === value,
          }))}
        />
        <p className="text-sm text-text-muted">Kemajuan dikira daripada rekod yang telah dimuktamadkan.</p>
      </div>

      {databaseError ? (
        <Alert variant="danger" title="Kemajuan PBD tidak dapat dimuatkan" className="mt-6">
          Cuba muatkan semula halaman ini. Data sekolah anda tidak diubah.
        </Alert>
      ) : setupIncomplete ? (
        <EmptyState
          icon={Settings2}
          title="Lengkapkan Setup PBD"
          description="Sediakan kelas aktif, subjek dan tetapan subjek kepada kelas sebelum kemajuan pengisian boleh dipaparkan."
          className="mt-6"
          action={
            canManagePbd ? (
              <Button href={setupHref}>Buka Setup PBD</Button>
            ) : (
              <p className="text-sm font-medium text-text-secondary">Hubungi pentadbir sekolah untuk melengkapkan setup.</p>
            )
          }
        />
      ) : summary ? (
        <Card className="mt-6 overflow-hidden">
          <CardContent className="p-5 sm:p-7">
            <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <Badge tone="primary">Kemajuan Semester {semester}</Badge>
                <p className="mt-3 font-display text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
                  {summary.final} <span className="text-2xl font-semibold text-text-muted sm:text-3xl">daripada {summary.assignments}</span>
                </p>
                <p className="mt-2 text-sm text-text-muted">tetapan kelas-subjek telah dimuktamadkan</p>
              </div>
              <p className="font-display text-4xl font-bold tabular-nums text-primary-700">{summary.finalizedPercentage.toFixed(1)}%</p>
            </div>
            <ProgressBar value={summary.finalizedPercentage} size="lg" label="Kemajuan PBD dimuktamadkan" className="mt-6" />
            <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard value={summary.empty} label="Belum diisi" icon={CircleDashed} />
              <StatCard value={summary.mismatch} label="Tidak sepadan" icon={FileWarning} tone="warning" />
              <StatCard value={summary.ready} label="Sedia dimuktamadkan" icon={CheckCircle2} tone="primary" />
              <StatCard value={summary.final} label="Muktamad" icon={CheckCircle2} tone="success" />
            </div>
          </CardContent>
          <CardFooter>
            <dl className="grid w-full grid-cols-3 gap-4 text-sm">
              <div><dt className="text-text-muted">Kelas aktif</dt><dd className="mt-1 font-semibold tabular-nums text-text-primary">{summary.activeClasses}</dd></div>
              <div><dt className="text-text-muted">Subjek aktif</dt><dd className="mt-1 font-semibold tabular-nums text-text-primary">{summary.activeSubjects}</dd></div>
              <div><dt className="text-text-muted">Tetapan aktif</dt><dd className="mt-1 font-semibold tabular-nums text-text-primary">{summary.assignments}</dd></div>
            </dl>
          </CardFooter>
        </Card>
      ) : null}

      {!setupIncomplete && summary ? (
        <section className="mt-8">
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-text-primary">Perlu tindakan</h2>
              <p className="mt-1 text-sm text-text-muted">{queue === "class" ? "Kelas dengan subjek yang belum selesai, disusun mengikut keutamaan." : "Subjek dengan kelas yang belum selesai, disusun mengikut keutamaan."}</p>
            </div>
            {canManagePbd ? (
              <Link href={setupHref} className="text-sm font-semibold text-primary-700 transition-colors hover:text-primary-800">Urus kelas dan subjek</Link>
            ) : null}
          </div>
          <div className="mt-4">
            <Tabs
              label="Pilih baris gilir kerja"
              items={[
                { key: "subject", label: "Mengikut subjek", href: queueHref(selectedYear, semester, "subject"), active: queue === "subject" },
                { key: "class", label: "Mengikut kelas", href: queueHref(selectedYear, semester, "class"), active: queue === "class" },
              ]}
            />
          </div>
          {queue === "class" ? (
            summary.classesNeedingAction.length ? (
              <Card className="mt-4 divide-y divide-border-default overflow-hidden">
                {summary.classesNeedingAction.map((klass) => {
                  const content = (
                    <>
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold text-text-primary">{klass.name}</h3>
                        <p className="mt-1 text-sm text-text-muted">{klass.assignments} subjek ditetapkan</p>
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {klass.mismatch ? <Badge tone="warning" icon={AlertCircle}>{klass.mismatch} tidak sepadan</Badge> : null}
                        {klass.ready ? <Badge tone="success" icon={CheckCircle2}>{klass.ready} sedia</Badge> : null}
                        {klass.empty ? <Badge tone="neutral" icon={CircleDashed}>{klass.empty} belum diisi</Badge> : null}
                        {canEnterPbd ? <ArrowUpRight className="h-4 w-4 shrink-0 text-text-disabled transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary-600" aria-hidden="true" /> : null}
                      </div>
                    </>
                  );
                  return canEnterPbd ? (
                    <Link key={klass.id} href={`/pbd/entry?year=${selectedYear}&semester=${semester}&view=class&classId=${klass.id}`} className="group flex min-w-0 flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface-inset/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">{content}</Link>
                  ) : (
                    <article key={klass.id} className="flex min-w-0 flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">{content}</article>
                  );
                })}
              </Card>
            ) : <AllRecordsDone />
          ) : summary.subjectsNeedingAction.length ? (
            <Card className="mt-4 divide-y divide-border-default overflow-hidden">
              {summary.subjectsNeedingAction.map((subject) => {
                const content = (
                  <>
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold text-text-primary">{subject.code} · {subject.name}</h3>
                      <p className="mt-1 text-sm text-text-muted">{subject.assignments} kelas ditetapkan</p>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      {subject.mismatch ? <Badge tone="warning" icon={AlertCircle}>{subject.mismatch} tidak sepadan</Badge> : null}
                      {subject.ready ? <Badge tone="success" icon={CheckCircle2}>{subject.ready} sedia</Badge> : null}
                      {subject.empty ? <Badge tone="neutral" icon={CircleDashed}>{subject.empty} belum diisi</Badge> : null}
                      {canEnterPbd ? <ArrowUpRight className="h-4 w-4 shrink-0 text-text-disabled transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary-600" aria-hidden="true" /> : null}
                    </div>
                  </>
                );
                return canEnterPbd ? (
                  <Link key={subject.id} href={`/pbd/entry?year=${selectedYear}&semester=${semester}&view=subject&subjectId=${subject.id}`} className="group flex min-w-0 flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface-inset/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">{content}</Link>
                ) : (
                  <article key={subject.id} className="flex min-w-0 flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">{content}</article>
                );
              })}
            </Card>
          ) : <AllRecordsDone />}
        </section>
      ) : null}

      {/* UPSA/UASA Entry Progress */}
      <AssessmentEntrySummary context={context} year={selectedYear} />

      {/* Quick module shortcuts */}
      <nav aria-label="Pentaksiran lain" className="mt-9">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-text-muted">Pentaksiran lain</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { href: `/assessments/${selectedYear}/upsa/entry`, label: "Isi Markah UPSA", icon: PenLine },
            { href: `/assessments/${selectedYear}/uasa/entry`, label: "Isi Markah UASA", icon: ClipboardList },
            { href: assessmentPath(upsaPeriod, "/classes"), label: "Analisis UPSA", icon: BarChart3 },
            { href: assessmentPath(uasaPeriod, "/classes"), label: "Analisis UASA", icon: PieChart },
            { href: `/pbd/periods/${selectedYear}?semester=${semester}`, label: "Analisis PBD", icon: Users },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col gap-2.5 rounded-xl border border-border-default bg-surface-card p-4 shadow-raised transition-[border-color,box-shadow] hover:border-primary-300 hover:shadow-card"
            >
              <item.icon className="h-5 w-5 text-primary-600" aria-hidden="true" />
              <span className="text-sm font-medium leading-5 text-text-secondary group-hover:text-text-primary">{item.label}</span>
            </Link>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Link href={`/dialog-prestasi?year=${selectedYear}`} className="group flex flex-col gap-2.5 rounded-xl border border-border-default bg-surface-card p-4 shadow-raised transition-[border-color,box-shadow] hover:border-primary-300 hover:shadow-card">
            <Presentation className="h-5 w-5 text-accent-600" aria-hidden="true" />
            <span className="text-sm font-medium leading-5 text-text-secondary group-hover:text-text-primary">Dialog Prestasi</span>
          </Link>
          <Link href="/insights" className="group flex flex-col gap-2.5 rounded-xl border border-border-default bg-surface-card p-4 shadow-raised transition-[border-color,box-shadow] hover:border-primary-300 hover:shadow-card">
            <Lightbulb className="h-5 w-5 text-accent-600" aria-hidden="true" />
            <span className="text-sm font-medium leading-5 text-text-secondary group-hover:text-text-primary">Dapatan</span>
          </Link>
        </div>
      </nav>
    </AppShell>
  );
}

function AllRecordsDone() {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-success-border bg-success-surface p-5">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
      <div>
        <h3 className="font-semibold text-success-text">Semua rekod selesai</h3>
        <p className="mt-1 text-sm text-success-text opacity-90">Semua tetapan kelas-subjek aktif telah dimuktamadkan.</p>
      </div>
    </div>
  );
}

async function AssessmentEntrySummary({ context, year }: { context: Awaited<ReturnType<typeof requireActorContext>>; year: string }) {
  if (!isDatabaseConfigured()) return null;
  let upsaProgress: Awaited<ReturnType<typeof getAssessmentEntryProgress>> = [];
  let uasaProgress: Awaited<ReturnType<typeof getAssessmentEntryProgress>> = [];
  try { upsaProgress = await getAssessmentEntryProgress(context, year, "upsa"); } catch { return null; }
  try { uasaProgress = await getAssessmentEntryProgress(context, year, "uasa"); } catch { /* ignore */ }
  if (upsaProgress.length === 0 && uasaProgress.length === 0) return null;

  const upsaFinal = upsaProgress.filter((r) => r.status === "final").length;
  const uasaFinal = uasaProgress.filter((r) => r.status === "final").length;

  return (
    <section className="mt-8">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-text-primary">Markah UPSA / UASA</h2>
          <p className="mt-1 text-sm text-text-muted">Kemajuan pengisian markah mengikut kelas dan subjek.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {upsaProgress.length > 0 && (
          <Link href={`/assessments/${year}/upsa/entry`} className="group rounded-xl border border-border-default bg-surface-card p-5 shadow-raised transition-[border-color,box-shadow] hover:border-primary-300 hover:shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-text-primary">UPSA</h3>
              <PenLine className="h-4 w-4 text-text-disabled transition-colors group-hover:text-primary-600" aria-hidden="true" />
            </div>
            <p className="mt-1 text-sm text-text-muted">{upsaFinal}/{upsaProgress.length} kelas-subjek selesai</p>
            <ProgressBar value={upsaFinal} max={upsaProgress.length} size="sm" className="mt-3" label="Kemajuan UPSA" />
          </Link>
        )}
        {uasaProgress.length > 0 && (
          <Link href={`/assessments/${year}/uasa/entry`} className="group rounded-xl border border-border-default bg-surface-card p-5 shadow-raised transition-[border-color,box-shadow] hover:border-primary-300 hover:shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-text-primary">UASA</h3>
              <PenLine className="h-4 w-4 text-text-disabled transition-colors group-hover:text-primary-600" aria-hidden="true" />
            </div>
            <p className="mt-1 text-sm text-text-muted">{uasaFinal}/{uasaProgress.length} kelas-subjek selesai</p>
            <ProgressBar value={uasaFinal} max={uasaProgress.length} size="sm" className="mt-3" label="Kemajuan UASA" />
          </Link>
        )}
      </div>
    </section>
  );
}
