import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, BookOpenCheck, CalendarClock, ClipboardList } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { requireSchoolContext } from "@/lib/auth";
import { assessmentPath, resolveAssessmentPeriod, resolvePbdPeriod } from "@/lib/config/periods";
import { assessmentModuleDestination, yearExists } from "@/lib/assessmentRoutes";
import { isUasaDataAvailable } from "@/lib/config/uasaAvailability";

export default async function AssessmentYearHubPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const school = await requireSchoolContext();
  const { assessmentPeriods, pbdPeriods } = school;
  if (!yearExists(year, assessmentPeriods, pbdPeriods)) {
    notFound();
  }

  const upsaPeriod = resolveAssessmentPeriod(assessmentPeriods, year, "upsa");
  const uasaPeriod = resolveAssessmentPeriod(assessmentPeriods, year, "uasa");
  const pbdPeriod = resolvePbdPeriod(pbdPeriods, year);
  const upsaHref = assessmentModuleDestination({ year, assessment: "upsa", assessmentPeriods, pbdPeriods }) ?? "/assessments";
  const uasaHref = assessmentModuleDestination({ year, assessment: "uasa", assessmentPeriods, pbdPeriods }) ?? `/uasa?year=${year}`;
  const pbdHref = pbdPeriod ? `/pbd/periods/${pbdPeriod.year}` : "/pbd";
  const uasaReady = isUasaDataAvailable(uasaPeriod);

  return (
    <AppShell>
      <PageHeader
        eyebrow={`Pentaksiran ${year}`}
        title={`Hub pentaksiran ${year}`}
        description="Pilih modul untuk membuka kelas, analisis, atau status data."
        icon={ClipboardList}
      />
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <AssessmentCard
          title="UPSA"
          description={upsaPeriod?.examName ?? "Ruang UPSA belum dikonfigurasi untuk tahun ini."}
          href={upsaHref}
          action="Buka kelas UPSA"
          status={upsaPeriod ? "Sedia" : "Belum tersedia"}
          ready={Boolean(upsaPeriod)}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <AssessmentCard
          title="UASA"
          description={uasaReady ? (uasaPeriod?.examName ?? "UASA") : "Data UASA belum tersedia untuk tempoh ini."}
          href={uasaHref}
          action={uasaReady ? "Buka kelas UASA" : "Lihat status UASA"}
          status={uasaReady ? "Sedia" : "Belum lengkap"}
          ready={uasaReady}
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <AssessmentCard
          title="PBD"
          description={pbdPeriod?.reportName ?? "Ruang PBD belum dikonfigurasi untuk tahun ini."}
          href={pbdHref}
          action="Buka PBD"
          status={pbdPeriod ? "Sedia" : "Belum tersedia"}
          ready={Boolean(pbdPeriod)}
          icon={<BookOpenCheck className="h-4 w-4" />}
        />
      </section>
      {upsaPeriod ? (
        <div className="mt-6">
          <Link href={assessmentPath(upsaPeriod, "/years")} className="rounded-md border px-3 py-2 text-sm">
            Lihat analisis tahun UPSA
          </Link>
        </div>
      ) : null}
    </AppShell>
  );
}

function AssessmentCard({
  title,
  description,
  href,
  action,
  status,
  ready,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
  status: string;
  ready: boolean;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-lg border bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-teal-100 p-2 text-teal-700">{icon}</span>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <StatusBadge tone={ready ? "success" : "warning"}>{status}</StatusBadge>
      </div>
      <p className="mt-3 min-h-12 text-sm text-slate-600">{description}</p>
      <Link href={href} className={ready ? "action-primary mt-4 text-sm" : "action-secondary mt-4 text-sm"}>
        {action}
      </Link>
    </article>
  );
}
