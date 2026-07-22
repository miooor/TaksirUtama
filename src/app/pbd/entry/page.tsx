import { Database, PenLine } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PbdEntryWorkspace } from "@/components/pbd/PbdEntryWorkspace";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/actor";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getDatabasePbdSetup } from "@/lib/db/pbd";
import { resolvePbdEntryMode, selectClassForEntry, selectSubjectForEntry, sortClassesForEntry } from "@/lib/pbd/entryWorkflow";
import { pbdSemesterHref, resolvePbdSemester } from "@/lib/pbdPages";

export default async function PbdEntryPage({ searchParams }: { searchParams: Promise<{ year?: string; semester?: string; classId?: string; subjectId?: string; view?: string }> }) {
  const context = await requireRole("school_admin", "platform_admin", "teacher");
  const query = await searchParams;
  const year = query.year && /^\d{4}$/.test(query.year) ? query.year : context.school.defaultPbdPeriod?.year ?? "2026";
  const semester = resolvePbdSemester(query.semester, context.school.defaultPbdPeriod?.semester);
  const mode = resolvePbdEntryMode(query.view);
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
  const eligibleClassIds = new Set(activeRows.map((row) => row.classId));
  const eligibleClasses = sortClassesForEntry(setup?.classes.filter((item) => item.active && eligibleClassIds.has(item.id)) ?? []);
  const selectedClassId = selectClassForEntry(
    eligibleClasses.map((item) => item.id),
    query.classId,
    query.subjectId,
    activeRows,
  );
  const canManageSetup = context.actor.role === "school_admin" || context.actor.role === "platform_admin";
  const selectionId = mode === "class" ? selectedClassId : selectedSubjectId;
  const description = mode === "class" ? "Satu kelas, semua subjek yang ditetapkan." : "Satu subjek, semua kelas yang ditetapkan.";
  return (
    <AppShell>
      <PageHeader eyebrow="PBD" title={`Pengisian Rumusan TP · Semester ${semester} · ${year}`} description={description} icon={PenLine} actions={<Button variant="outline" size="sm" href={pbdSemesterHref(`/pbd/periods/${year}`, semester)}>Lihat analisis</Button>} />
      {!databaseConfigured ? (
        <EmptyState
          icon={Database}
          title="Pangkalan data belum disambungkan"
          description="Tetapkan DATABASE_URL, jalankan migrasi pangkalan data, kemudian buka semula halaman ini."
          className="mt-6"
        />
      ) : (
        <PbdEntryWorkspace
          key={`${semester}:${mode}:${selectionId ?? "none"}`}
          setup={setup!}
          year={year}
          semester={semester}
          mode={mode}
          selectedSubjectId={selectedSubjectId}
          selectedClassId={selectedClassId}
          canManageSetup={canManageSetup}
        />
      )}
    </AppShell>
  );
}
