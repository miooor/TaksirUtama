import { Database, NotebookPen } from "lucide-react";
import { PbdInterventionWorkspace } from "@/components/pbd/PbdInterventionWorkspace";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/actor";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getDatabasePbdInterventions } from "@/lib/db/interventions";
import { getDatabasePbdSetup } from "@/lib/db/pbd";
import { getSchoolRegistry } from "@/lib/db/schoolRegistry";
import { resolvePbdSemester } from "@/lib/pbdPages";

type EntrySearchParams = { year?: string; semester?: string; subjectId?: string; status?: string; classId?: string; tp?: string; reviewBefore?: string };

export default async function PbdInterventionEntryPage({ searchParams }: { searchParams: Promise<EntrySearchParams> }) {
  const context = await requireRole("teacher", "school_admin", "platform_admin");
  const query = await searchParams;
  const year = query.year && /^\d{4}$/.test(query.year) ? query.year : context.school.defaultPbdPeriod?.year ?? "2026";
  const semester = resolvePbdSemester(query.semester, context.school.defaultPbdPeriod?.semester);
  const databaseConfigured = isDatabaseConfigured();
  const [setup, registry, entries] = databaseConfigured
    ? await Promise.all([getDatabasePbdSetup(context, year, semester), getSchoolRegistry(context, year), getDatabasePbdInterventions(context, year, semester)])
    : [null, null, []];

  return <AppShell>
    <PageHeader eyebrow="PBD" title={`Intervensi · Semester ${semester} · ${year}`} description="Baris gilir kerja intervensi murid TP1 dan TP2." icon={NotebookPen} actions={<Button variant="outline" size="sm" href={`/intervensi?year=${year}&semester=${semester}`}>Lihat pemantauan</Button>} />
    {!databaseConfigured ? (
      <EmptyState
        icon={Database}
        title="Pangkalan data belum disambungkan"
        description="Sambungkan pangkalan data dan jalankan migrasi sebelum merekod intervensi."
        className="mt-6"
      />
    ) : <PbdInterventionWorkspace setup={setup!} registry={registry!} entries={entries} year={year} semester={semester} filterParams={{ status: query.status, subjectId: query.subjectId, classId: query.classId, tp: query.tp, reviewBefore: query.reviewBefore }} />}
  </AppShell>;
}
