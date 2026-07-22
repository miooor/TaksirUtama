import { Database, PenLine } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PbdEntryWorkspace } from "@/components/pbd/PbdEntryWorkspace";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/actor";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getDatabasePbdSetup } from "@/lib/db/pbd";
import { selectSubjectForEntry } from "@/lib/pbd/subjectEntryWorkflow";
import { pbdSemesterHref, resolvePbdSemester } from "@/lib/pbdPages";

export default async function PbdEntryPage({ searchParams }: { searchParams: Promise<{ year?: string; semester?: string; classId?: string; subjectId?: string }> }) {
  const context = await requireRole("school_admin", "platform_admin");
  const query = await searchParams;
  const year = query.year && /^\d{4}$/.test(query.year) ? query.year : context.school.defaultPbdPeriod?.year ?? "2026";
  const semester = resolvePbdSemester(query.semester, context.school.defaultPbdPeriod?.semester);
  const databaseConfigured = isDatabaseConfigured();
  const setup = databaseConfigured ? await getDatabasePbdSetup(context, year, semester) : null;

  const activeRows = setup?.rows.filter((row) => row.active && setup.classes.some((item) => item.id === row.classId && item.active) && setup.subjects.some((item) => item.id === row.subjectId && item.active)) ?? [];
  const eligibleSubjectIds = new Set(activeRows.map((row) => row.subjectId));
  const eligibleSubjects = setup?.subjects.filter((item) => item.active && eligibleSubjectIds.has(item.id)) ?? [];
  const selectedSubjectId = selectSubjectForEntry(
    eligibleSubjects.map((item) => item.id),
    query.subjectId,
    query.classId,
    activeRows,
  );
  return (
    <AppShell>
      <PageHeader eyebrow="PBD" title={`Pengisian Rumusan TP · Semester ${semester} · ${year}`} description="Satu subjek, semua kelas yang ditetapkan." icon={PenLine} actions={<Button variant="outline" size="sm" href={pbdSemesterHref(`/pbd/periods/${year}`, semester)}>Lihat analisis</Button>} />
      {!databaseConfigured ? (
        <EmptyState
          icon={Database}
          title="Pangkalan data belum disambungkan"
          description="Tetapkan DATABASE_URL, jalankan migrasi pangkalan data, kemudian buka semula halaman ini."
          className="mt-6"
        />
      ) : <PbdEntryWorkspace key={`${semester}:${selectedSubjectId ?? "none"}`} setup={setup!} year={year} semester={semester} selectedSubjectId={selectedSubjectId} />}
    </AppShell>
  );
}
