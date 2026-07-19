"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { archiveInterventionAction, saveInterventionAction, type InterventionActionState } from "@/app/pbd/interventions/entry/actions";
import type { DatabasePbdSetup } from "@/lib/db/pbd";
import { calculateInterventionCoverage } from "@/lib/pbd/interventionWorkflow";
import { pbdSemesterSwitchMessage } from "@/lib/pbd/subjectEntryWorkflow";
import type { PbdInterventionEntry } from "@/types/intervention";
import type { SchoolRegistry, StudentClassEnrollment } from "@/types/registry";

const initialState: InterventionActionState = {};

function Message({ state }: { state: InterventionActionState }) {
  if (state.error) return <p className="mt-2 text-sm text-red-700" role="alert">{state.error}</p>;
  if (state.success) return <p className="mt-2 text-sm text-teal-800" role="status">{state.success}</p>;
  return null;
}

function InterventionForm({
  year, semester, classSubjectId, enrollment, entry, editorId, onDirty,
}: {
  year: string;
  semester: "1" | "2";
  classSubjectId: string;
  enrollment: StudentClassEnrollment;
  entry?: PbdInterventionEntry;
  editorId: string;
  onDirty: (id: string, dirty: boolean) => void;
}) {
  const [state, action, pending] = useActionState(saveInterventionAction, initialState);
  useEffect(() => { if (state.success) onDirty(editorId, false); }, [editorId, onDirty, state.success]);
  return <form action={action} onChange={() => onDirty(editorId, true)} className="min-w-0 rounded-md bg-stone-50 p-4">
    <input type="hidden" name="year" value={year} />
    <input type="hidden" name="semester" value={semester} />
    <input type="hidden" name="classSubjectId" value={classSubjectId} />
    <input type="hidden" name="classEnrollmentId" value={enrollment.id} />
    <input type="hidden" name="expectedRevision" value={entry?.revision ?? 0} />
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(12rem,0.7fr)_6rem_minmax(16rem,1.35fr)_minmax(16rem,1.35fr)_auto] lg:items-start">
      <div className="min-w-0"><p className="break-words font-medium text-slate-950">{enrollment.student.displayName}</p><p className="mt-1 text-xs text-slate-600">{enrollment.student.pupilCode ?? (enrollment.rosterNumber ? `Bil. ${enrollment.rosterNumber}` : "Tiada kod murid")}</p></div>
      <label className="block text-sm text-slate-700">TP<select name="tpLevel" defaultValue={entry?.tp ?? 2} className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2"><option value="1">TP1</option><option value="2">TP2</option></select></label>
      <label className="block min-w-0 text-sm text-slate-700">Masalah<textarea name="problem" required maxLength={2000} rows={3} defaultValue={entry?.problem ?? ""} className="mt-1 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm" /></label>
      <label className="block min-w-0 text-sm text-slate-700">Intervensi<textarea name="intervention" required maxLength={2000} rows={3} defaultValue={entry?.intervention ?? ""} className="mt-1 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm" /></label>
      <button disabled={pending} className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{pending ? "Menyimpan…" : entry ? "Simpan" : "Tambah"}</button>
    </div>
    <Message state={state} />
  </form>;
}

function NewInterventionForm({
  year, semester, classSubjectId, enrollments, editorId, onDirty,
}: {
  year: string;
  semester: "1" | "2";
  classSubjectId: string;
  enrollments: StudentClassEnrollment[];
  editorId: string;
  onDirty: (id: string, dirty: boolean) => void;
}) {
  const [state, action, pending] = useActionState(saveInterventionAction, initialState);
  useEffect(() => { if (state.success) onDirty(editorId, false); }, [editorId, onDirty, state.success]);
  return <form action={action} onChange={() => onDirty(editorId, true)} className="mt-4 min-w-0">
    <input type="hidden" name="year" value={year} /><input type="hidden" name="semester" value={semester} /><input type="hidden" name="classSubjectId" value={classSubjectId} /><input type="hidden" name="expectedRevision" value="0" />
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(12rem,0.7fr)_6rem_minmax(16rem,1.35fr)_minmax(16rem,1.35fr)_auto] lg:items-start">
      <label className="block min-w-0 text-sm text-slate-700">Murid<select required name="classEnrollmentId" className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2"><option value="">Pilih murid</option>{enrollments.map((item) => <option key={item.id} value={item.id}>{item.rosterNumber ? `${item.rosterNumber}. ` : ""}{item.student.displayName}</option>)}</select></label>
      <label className="block text-sm text-slate-700">TP<select name="tpLevel" defaultValue="2" className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2"><option value="1">TP1</option><option value="2">TP2</option></select></label>
      <label className="block min-w-0 text-sm text-slate-700">Masalah<textarea name="problem" required maxLength={2000} rows={3} className="mt-1 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm" /></label>
      <label className="block min-w-0 text-sm text-slate-700">Intervensi<textarea name="intervention" required maxLength={2000} rows={3} className="mt-1 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm" /></label>
      <button disabled={pending} className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{pending ? "Menyimpan…" : "Tambah"}</button>
    </div><Message state={state} />
  </form>;
}

function ArchiveForm({ entry }: { entry: PbdInterventionEntry }) {
  const [state, action, pending] = useActionState(archiveInterventionAction, initialState);
  return <form action={action} className="mt-2 flex flex-wrap items-center gap-3">
    <input type="hidden" name="interventionId" value={entry.id} />
    <input type="hidden" name="expectedRevision" value={entry.revision} />
    <input type="hidden" name="restore" value={entry.active === false ? "true" : "false"} />
    <button disabled={pending} className="text-sm font-medium text-slate-700 hover:text-slate-950 disabled:opacity-60">{entry.active === false ? "Restore" : "Archive"}</button>
    <Message state={state} />
  </form>;
}

function coverageTone(status: ReturnType<typeof calculateInterventionCoverage>["status"]) {
  if (status === "complete") return "text-teal-800";
  if (status === "missing" || status === "excess") return "text-amber-800";
  return "text-slate-600";
}

export function PbdInterventionWorkspace({
  setup, registry, entries, year, semester, selectedSubjectId,
}: {
  setup: DatabasePbdSetup;
  registry: SchoolRegistry;
  entries: PbdInterventionEntry[];
  year: string;
  semester: "1" | "2";
  selectedSubjectId: string | null;
}) {
  const router = useRouter();
  const [dirtyEditors, setDirtyEditors] = useState<Set<string>>(new Set());
  const hasDirty = dirtyEditors.size > 0;
  const activeRows = setup.rows.filter((row) => row.active && setup.classes.some((item) => item.id === row.classId && item.active) && setup.subjects.some((item) => item.id === row.subjectId && item.active));
  const eligibleSubjectIds = new Set(activeRows.map((row) => row.subjectId));
  const subjects = setup.subjects.filter((item) => item.active && eligibleSubjectIds.has(item.id));
  const selectedSubject = subjects.find((item) => item.id === selectedSubjectId) ?? null;
  const rows = selectedSubject ? activeRows.filter((row) => row.subjectId === selectedSubject.id).sort((a, b) => (a.classLevelNumber ?? 99) - (b.classLevelNumber ?? 99) || a.className.localeCompare(b.className, "ms")) : [];

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (hasDirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [hasDirty]);

  const markDirty = useCallback((id: string, dirty: boolean) => {
    setDirtyEditors((current) => { const next = new Set(current); if (dirty) next.add(id); else next.delete(id); return next; });
  }, []);

  function navigate(href: string, warning: string) {
    if (!hasDirty || window.confirm(warning)) { router.push(href); return true; }
    return false;
  }

  const activeCount = useMemo(() => entries.filter((item) => item.active !== false && item.subjectId === selectedSubjectId).length, [entries, selectedSubjectId]);

  if (!selectedSubject) return <section className="mt-6 rounded-lg bg-white p-6"><h2 className="text-lg font-semibold">Belum ada subjek yang ditetapkan</h2><p className="mt-2 text-sm text-slate-600">Tetapkan subjek kepada kelas sebelum merekod intervensi.</p><Link className="mt-4 inline-block rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white" href={`/school/setup?year=${year}&semester=${semester}&view=assignments`}>Buka Setup Sekolah</Link></section>;

  return <div className="mt-6 min-w-0 space-y-5">
    <section className="rounded-lg bg-white p-4 sm:p-5">
      <fieldset><legend className="text-sm font-medium text-slate-700">Semester</legend><div className="mt-2 grid max-w-sm grid-cols-2 gap-2">{(["1", "2"] as const).map((item) => <button key={item} type="button" aria-current={semester === item ? "page" : undefined} onClick={() => navigate(`/pbd/interventions/entry?year=${year}&semester=${item}&subjectId=${selectedSubject.id}`, pbdSemesterSwitchMessage(semester, item))} className={`rounded-md px-4 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 ${semester === item ? "bg-stone-800 text-white" : "bg-stone-100 text-slate-800 hover:bg-stone-200"}`}>Semester {item}</button>)}</div></fieldset>
      <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-[minmax(15rem,1fr)_auto] md:items-end">
        <label className="block min-w-0 text-sm font-medium text-slate-700">Subjek<select value={selectedSubject.id} onChange={(event) => { if (!navigate(`/pbd/interventions/entry?year=${year}&semester=${semester}&subjectId=${event.target.value}`, "Perubahan intervensi belum disimpan. Tukar subjek?")) event.currentTarget.value = selectedSubject.id; }} className="mt-1.5 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-base">{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>)}</select></label>
        <p className="text-sm text-slate-600 md:text-right">{rows.length} kelas · {activeCount} intervensi aktif</p>
      </div>
    </section>

    {rows.map((row) => {
      const classEnrollments = registry.enrollments.filter((item) => item.active && item.classId === row.classId).sort((a, b) => (a.rosterNumber ?? 9999) - (b.rosterNumber ?? 9999) || a.student.displayName.localeCompare(b.student.displayName, "ms"));
      const classEntries = entries.filter((item) => item.classSubjectId === row.classSubjectId);
      const activeEntries = classEntries.filter((item) => item.active !== false);
      const usedEnrollmentIds = new Set(classEntries.map((item) => item.classEnrollmentId));
      const available = classEnrollments.filter((item) => !usedEnrollmentIds.has(item.id));
      const expectedTp1 = row.entry?.status === "final" ? row.entry.counts.TP1 ?? 0 : null;
      const expectedTp2 = row.entry?.status === "final" ? row.entry.counts.TP2 ?? 0 : null;
      const coverage = [calculateInterventionCoverage(1, expectedTp1, activeEntries), calculateInterventionCoverage(2, expectedTp2, activeEntries)];
      return <section key={row.classSubjectId} className="min-w-0 rounded-lg bg-white p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-lg font-semibold text-slate-950">{row.className}</h2><p className="mt-1 text-sm text-slate-600">{classEnrollments.length} murid dalam daftar · {activeEntries.length} intervensi</p></div><div className="text-sm sm:text-right">{coverage.map((item) => <p key={item.tp} className={coverageTone(item.status)}>{item.label}</p>)}</div></div>
        {classEnrollments.length === 0 ? <div className="mt-4 bg-amber-50 p-4 text-sm text-amber-950">Daftar murid belum tersedia. <Link className="font-semibold underline" href={`/school/setup?year=${year}&semester=${semester}&view=pupils#class-${row.classId}`}>Tambah murid untuk {row.className}</Link>.</div> : null}
        <div className="mt-5 space-y-3">
          {classEntries.map((entry) => {
            const enrollment = classEnrollments.find((item) => item.id === entry.classEnrollmentId) ?? registry.enrollments.find((item) => item.id === entry.classEnrollmentId);
            if (!enrollment) return null;
            if (entry.active === false) return <article key={entry.id} className="rounded-md bg-stone-50 p-4 text-sm text-slate-600"><div className="grid min-w-0 gap-3 md:grid-cols-[minmax(10rem,0.7fr)_4rem_minmax(0,1fr)_minmax(0,1fr)]"><div><p className="font-medium text-slate-900">{enrollment.student.displayName}</p><p className="mt-1">Diarkibkan</p></div><p>TP{entry.tp}</p><p className="break-words"><span className="block text-xs font-medium text-slate-500">Masalah</span>{entry.problem}</p><p className="break-words"><span className="block text-xs font-medium text-slate-500">Intervensi</span>{entry.intervention}</p></div><ArchiveForm entry={entry} /></article>;
            return <div key={entry.id}><InterventionForm year={year} semester={semester} classSubjectId={row.classSubjectId} enrollment={enrollment} entry={entry} editorId={entry.id!} onDirty={markDirty} /><ArchiveForm entry={entry} /></div>;
          })}
        </div>
        {available.length > 0 ? <details className="mt-5 rounded-md border border-stone-200 p-4"><summary className="cursor-pointer font-medium text-teal-900">Tambah intervensi murid</summary><p className="mt-3 text-sm text-slate-600">Pilih seorang murid. Setiap murid mempunyai satu rekod bagi subjek dan semester ini.</p><NewInterventionForm year={year} semester={semester} classSubjectId={row.classSubjectId} enrollments={available} editorId={`new:${row.classSubjectId}`} onDirty={markDirty} /></details> : classEnrollments.length > 0 ? <p className="mt-5 text-sm text-slate-600">Semua murid dalam kelas ini sudah mempunyai rekod aktif atau arkib.</p> : null}
      </section>;
    })}
  </div>;
}
