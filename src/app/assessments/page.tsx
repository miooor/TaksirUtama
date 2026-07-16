import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { requireSchoolContext } from "@/lib/auth";
import { listPeriodYears } from "@/lib/config/periods";

export default async function AssessmentsPage() {
  const school = await requireSchoolContext();
  const years = listPeriodYears(school.assessmentPeriods, school.pbdPeriods);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Pentaksiran"
        title="Pilih pentaksiran"
        description="Pilih tahun untuk membuka UPSA, UASA, dan PBD yang tersedia."
        icon={ClipboardList}
      />
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {years.map((year) => (
          <article key={year} className="rounded-lg border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">Tahun {year}</h2>
              <StatusBadge>{year}</StatusBadge>
            </div>
            <p className="mt-2 text-sm text-slate-600">Buka hub pentaksiran untuk tahun ini.</p>
            <Link href={`/assessments/${year}`} className="action-primary mt-4 text-sm">
              Buka tahun
            </Link>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
