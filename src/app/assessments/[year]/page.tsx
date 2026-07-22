import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, BookOpenCheck, CalendarClock, ClipboardList, Database, PenLine } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireActorContext } from "@/lib/auth/actor";
import { resolveAssessmentPeriod, resolvePbdPeriod } from "@/lib/config/periods";
import { yearExists } from "@/lib/assessmentRoutes";
import { isUasaDataAvailable } from "@/lib/config/uasaAvailability";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getAssessmentEntryProgress } from "@/lib/db/assessmentEntry";

export default async function AssessmentYearHubPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const context = await requireActorContext();
  const school = context.school;
  const { assessmentPeriods, pbdPeriods } = school;
  if (!yearExists(year, assessmentPeriods, pbdPeriods)) {
    notFound();
  }

  const upsaPeriod = resolveAssessmentPeriod(assessmentPeriods, year, "upsa");
  const uasaPeriod = resolveAssessmentPeriod(assessmentPeriods, year, "uasa");
  const pbdPeriod = resolvePbdPeriod(pbdPeriods, year);
  const uasaReady = isUasaDataAvailable(uasaPeriod);
  const databaseConfigured = isDatabaseConfigured();

  // Load entry progress for UPSA and UASA
  let upsaProgress: Awaited<ReturnType<typeof getAssessmentEntryProgress>> = [];
  let uasaProgress: Awaited<ReturnType<typeof getAssessmentEntryProgress>> = [];
  if (databaseConfigured) {
    try { upsaProgress = await getAssessmentEntryProgress(context, year, "upsa"); } catch { /* graceful */ }
    try { uasaProgress = await getAssessmentEntryProgress(context, year, "uasa"); } catch { /* graceful */ }
  }

  const upsaFinal = upsaProgress.filter((r) => r.status === "final").length;
  const upsaTotal = upsaProgress.length;
  const uasaFinal = uasaProgress.filter((r) => r.status === "final").length;
  const uasaTotal = uasaProgress.length;

  return (
    <AppShell>
      <PageHeader
        eyebrow={`Pentaksiran ${year}`}
        title={`Hub pentaksiran ${year}`}
        description="Pengisian markah dan analisis UPSA, UASA, dan PBD."
        icon={ClipboardList}
      />

      {/* Entry Progress Section */}
      {databaseConfigured && (upsaTotal > 0 || uasaTotal > 0) ? (
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <EntryProgressCard
            label="UPSA"
            examName={upsaPeriod?.examName ?? "UPSA"}
            finalCount={upsaFinal}
            totalCount={upsaTotal}
            entryHref={`/assessments/${year}/upsa/entry`}
            analysisHref={`/assessments/${year}/upsa/classes`}
          />
          <EntryProgressCard
            label="UASA"
            examName={uasaPeriod?.examName ?? "UASA"}
            finalCount={uasaFinal}
            totalCount={uasaTotal}
            entryHref={`/assessments/${year}/uasa/entry`}
            analysisHref={`/assessments/${year}/uasa/classes`}
            ready={uasaReady}
          />
        </section>
      ) : !databaseConfigured ? (
        <EmptyState
          icon={Database}
          title="Pangkalan data belum disambungkan"
          description="Tetapkan DATABASE_URL dan jalankan migrasi untuk mengaktifkan pengisian markah dalam aplikasi."
          className="mt-6"
        />
      ) : (
        <EmptyState
          icon={PenLine}
          title="Sediakan kelas dan subjek"
          description="Tiada kelas dan subjek dikonfigurasi untuk tahun ini. Buka Setup Sekolah untuk menyediakan kelas, subjek, dan roster murid."
          className="mt-6"
          action={<Button href={`/school/setup?year=${year}`}>Buka Setup Sekolah</Button>}
        />
      )}

      {/* Module Cards */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <ModuleCard
          title="UPSA"
          description={upsaPeriod?.examName ?? "Ujian Pertengahan Sesi Akademik"}
          primaryAction="Isi Markah"
          primaryHref={`/assessments/${year}/upsa/entry`}
          secondaryAction="Lihat Analisis"
          secondaryHref={`/assessments/${year}/upsa/classes`}
          status={databaseConfigured && upsaTotal > 0 ? `${upsaFinal}/${upsaTotal} selesai` : upsaPeriod ? "Sedia" : "Belum tersedia"}
          ready={Boolean(upsaPeriod) || databaseConfigured}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <ModuleCard
          title="UASA"
          description={uasaPeriod?.examName ?? "Ujian Akhir Sesi Akademik"}
          primaryAction="Isi Markah"
          primaryHref={`/assessments/${year}/uasa/entry`}
          secondaryAction="Lihat Analisis"
          secondaryHref={`/assessments/${year}/uasa/classes`}
          status={databaseConfigured && uasaTotal > 0 ? `${uasaFinal}/${uasaTotal} selesai` : uasaReady ? "Sedia" : "Belum lengkap"}
          ready={uasaReady || databaseConfigured}
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <ModuleCard
          title="PBD"
          description={pbdPeriod?.reportName ?? "Pentaksiran Bilik Darjah"}
          primaryAction="Isi Rumusan TP"
          primaryHref={`/pbd/entry?year=${year}&semester=1`}
          secondaryAction="Analisis PBD"
          secondaryHref={pbdPeriod ? `/pbd/periods/${pbdPeriod.year}` : "/pbd"}
          status={pbdPeriod ? "Sedia" : "Belum tersedia"}
          ready={Boolean(pbdPeriod)}
          icon={<BookOpenCheck className="h-4 w-4" />}
        />
      </section>
    </AppShell>
  );
}

function EntryProgressCard({ label, examName, finalCount, totalCount, entryHref, analysisHref, ready = true }: {
  label: string; examName: string; finalCount: number; totalCount: number; entryHref: string; analysisHref: string; ready?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-text-primary">{label}</h2>
          <Badge tone={finalCount === totalCount && totalCount > 0 ? "success" : finalCount > 0 ? "warning" : "neutral"}>
            {finalCount}/{totalCount} selesai
          </Badge>
        </div>
        <p className="mt-1 text-sm text-text-muted">{examName}</p>
        {totalCount > 0 && <ProgressBar value={finalCount} max={totalCount} size="sm" className="mt-3" label={`Kemajuan ${label}`} />}
        <div className="mt-4 flex items-center gap-3">
          <Button size="sm" icon={PenLine} href={entryHref}>Isi Markah</Button>
          {ready && totalCount > 0 && (
            <Link href={analysisHref} className="text-sm font-semibold text-text-muted transition-colors hover:text-text-primary">Lihat Analisis</Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ModuleCard({ title, description, primaryAction, primaryHref, secondaryAction, secondaryHref, status, ready, icon }: {
  title: string; description: string; primaryAction: string; primaryHref: string; secondaryAction: string; secondaryHref: string; status: string; ready: boolean; icon: React.ReactNode;
}) {
  return (
    <Card hover>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">{icon}</span>
            <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
          </div>
          <Badge tone={ready ? "success" : "warning"}>{status}</Badge>
        </div>
        <p className="mt-3 min-h-12 text-sm leading-5 text-text-muted">{description}</p>
        <div className="mt-4 flex items-center gap-3">
          <Button size="sm" variant={ready ? "primary" : "outline"} href={primaryHref}>{primaryAction}</Button>
          <Link href={secondaryHref} className="text-sm font-semibold text-text-muted transition-colors hover:text-text-primary">{secondaryAction}</Link>
        </div>
      </CardContent>
    </Card>
  );
}
