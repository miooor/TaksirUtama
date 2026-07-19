import Link from "next/link";
import { Database, NotebookPen } from "lucide-react";
import { PbdInterventionWorkspace } from "@/components/pbd/PbdInterventionWorkspace";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
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
    <PageHeader eyebrow="PBD" title={`Isi Intervensi · Semester ${semester} · ${year}`} description="Rekod murid TP1 dan TP2 mengikut subjek." icon={NotebookPen} actions={<Link className="rounded-md border border-stone-300 px-3 py-2" href={`/intervensi?year=${year}&semester=${semester}`}>Lihat pemantauan</Link>} />
    {!databaseConfigured ? <section className="mt-6 rounded-lg bg-white p-6"><Database className="h-5 w-5 text-teal-800" /><h2 className="mt-3 font-semibold">Pangkalan data belum disambungkan</h2><p className="mt-2 text-sm text-slate-600">Sambungkan pangkalan data dan jalankan migrasi sebelum merekod intervensi.</p></section> : <PbdInterventionWorkspace key={`${semester}:${selectedSubjectId ?? "none"}`} setup={setup!} registry={registry!} entries={entries} year={year} semester={semester} selectedSubjectId={selectedSubjectId} />}
  </AppShell>;
}
