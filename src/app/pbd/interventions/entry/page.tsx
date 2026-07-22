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
import { selectSubjectForEntry } from "@/lib/pbd/subjectEntryWorkflow";
import { resolvePbdSemester } from "@/lib/pbdPages";

export default async function PbdInterventionEntryPage({ searchParams }: { searchParams: Promise<{ year?: string; semester?: string; subjectId?: string }> }) {
  const context = await requireRole("school_admin", "platform_admin");
  const query = await searchParams;
  const year = query.year && /^\d{4}$/.test(query.year) ? query.year : context.school.defaultPbdPeriod?.year ?? "2026";
  const semester = resolvePbdSemester(query.semester, context.school.defaultPbdPeriod?.semester);
  const databaseConfigured = isDatabaseConfigured();
  const [setup, registry, entries] = databaseConfigured
    ? await Promise.all([getDatabasePbdSetup(context, year, semester), getSchoolRegistry(context, year), getDatabasePbdInterventions(context, year, semester)])
    : [null, null, []];
  const activeRows = setup?.rows.filter((row) => row.active && setup.classes.some((item) => item.id === row.classId && item.active) && setup.subjects.some((item) => item.id === row.subjectId && item.active)) ?? [];
  const eligibleSubjectIds = new Set(activeRows.map((row) => row.subjectId));
  const eligibleSubjects = setup?.subjects.filter((item) => item.active && eligibleSubjectIds.has(item.id)) ?? [];
  const selectedSubjectId = selectSubjectForEntry(eligibleSubjects.map((item) => item.id), query.subjectId, undefined, activeRows);

  return <AppShell>
    <PageHeader eyebrow="PBD" title={`Isi Intervensi · Semester ${semester} · ${year}`} description="Rekod murid TP1 dan TP2 mengikut subjek." icon={NotebookPen} actions={<Button variant="outline" size="sm" href={`/intervensi?year=${year}&semester=${semester}`}>Lihat pemantauan</Button>} />
    {!databaseConfigured ? (
      <EmptyState
        icon={Database}
        title="Pangkalan data belum disambungkan"
        description="Sambungkan pangkalan data dan jalankan migrasi sebelum merekod intervensi."
        className="mt-6"
      />
    ) : <PbdInterventionWorkspace key={`${semester}:${selectedSubjectId ?? "none"}`} setup={setup!} registry={registry!} entries={entries} year={year} semester={semester} selectedSubjectId={selectedSubjectId} />}
  </AppShell>;
}
