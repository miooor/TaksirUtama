import Link from "next/link";
import { Database, PenLine } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PbdEntryWorkspace } from "@/components/pbd/PbdEntryWorkspace";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/actor";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getDatabasePbdSetup } from "@/lib/db/pbd";
import { selectSubjectForEntry } from "@/lib/pbd/subjectEntryWorkflow";

export default async function PbdEntryPage({ searchParams }: { searchParams: Promise<{ year?: string; semester?: string; classId?: string; subjectId?: string }> }) {
  const context = await requireRole("school_admin", "platform_admin");
  const query = await searchParams;
  const year = query.year && /^\d{4}$/.test(query.year) ? query.year : context.school.defaultPbdPeriod?.year ?? "2026";
  const semester = query.semester === "2" ? "2" : "1";
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
      <PageHeader eyebrow={`PBD · Semester ${semester}`} title="Isi Rumusan TP Mengikut Subjek" description="Satu subjek, semua kelas yang ditetapkan." icon={PenLine} actions={<Link className="rounded-md border px-3 py-2" href={`/pbd/periods/${year}`}>Lihat analisis</Link>} />
      {!databaseConfigured ? <section className="mt-6 rounded-lg bg-white p-6"><Database className="h-5 w-5 text-teal-800" /><h2 className="mt-3 font-semibold">Pangkalan data belum disambungkan</h2><p className="mt-2 max-w-2xl text-sm text-slate-600">Tetapkan DATABASE_URL, jalankan migrasi pangkalan data, kemudian buka semula halaman ini.</p></section> : <PbdEntryWorkspace key={selectedSubjectId ?? "none"} setup={setup!} year={year} semester={semester} selectedSubjectId={selectedSubjectId} />}
    </AppShell>
  );
}
