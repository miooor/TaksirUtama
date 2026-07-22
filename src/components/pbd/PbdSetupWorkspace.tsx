"use client";

import { useActionState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import type { DatabasePbdSetup } from "@/lib/db/pbd";
import type { SchoolRegistry } from "@/types/registry";
import { SchoolRosterWorkspace } from "@/components/school/SchoolRosterWorkspace";
import { pbdSetupCounts, type PbdSetupView } from "@/lib/pbd/setupWorkflow";
import { archivePbdSetupAction, assignPbdSubjectAction, createPbdClassAction, createPbdSubjectAction, deletePbdSetupAction, updatePbdClassEnrollmentAction, updatePbdClassTeacherAction, type PbdActionState } from "@/app/pbd/entry/actions";

const initialState: PbdActionState = {};
function Message({ state }: { state: PbdActionState }) { return state.error ? <p className="mt-2 text-sm font-medium text-rose-700" role="alert">{state.error}</p> : state.success ? <p className="mt-2 text-sm font-medium text-teal-800" role="status">{state.success}</p> : null; }

function AddClass({ year }: { year: string }) {
  const [state, action, pending] = useActionState(createPbdClassAction, initialState);
  return <form action={action} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><input name="year" type="hidden" value={year} /><label className="text-sm font-medium">Nama kelas<input name="name" required className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2" placeholder="1 Cemerlang" /></label><label className="text-sm font-medium">Peringkat<select name="levelKind" className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2"><option value="tahun">Tahun</option><option value="tingkatan">Tingkatan</option><option value="peralihan">Peralihan</option></select></label><label className="text-sm font-medium">Tahun/Tingkatan<input name="levelNumber" type="number" min="1" max="6" defaultValue="1" className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2" /></label><label className="text-sm font-medium">Jumlah murid<input name="enrolledCount" required type="number" min="0" className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2" /></label><label className="text-sm font-medium sm:col-span-2 xl:col-span-1">Nama guru kelas<input name="teacherName" className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2" placeholder="Pilihan" /></label><button disabled={pending} className="self-end rounded-md bg-teal-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Tambah kelas</button><div className="sm:col-span-2 xl:col-span-6"><Message state={state} /></div></form>;
}

function AddSubject() {
  const [state, action, pending] = useActionState(createPbdSubjectAction, initialState);
  return <form action={action} className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto]"><label className="text-sm font-medium">Kod subjek<input name="code" required className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 uppercase" placeholder="BM" /></label><label className="text-sm font-medium">Nama subjek<input name="name" required className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2" placeholder="Bahasa Melayu" /></label><button disabled={pending} className="self-end rounded-md bg-teal-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Tambah subjek</button><div className="sm:col-span-3"><Message state={state} /></div></form>;
}

function Assignment({ setup, year, semester }: { setup: DatabasePbdSetup; year: string; semester: "1" | "2" }) {
  const [state, action, pending] = useActionState(assignPbdSubjectAction, initialState);
  const classes = setup.classes.filter((item) => item.active); const subjects = setup.subjects.filter((item) => item.active);
  if (!classes.length || !subjects.length) return <p className="text-sm text-slate-600">Tambah sekurang-kurangnya satu kelas dan satu subjek dahulu.</p>;
  return <form action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><input type="hidden" name="year" value={year} /><input type="hidden" name="semester" value={semester} /><label className="text-sm font-medium">Kelas<select name="classId" className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2">{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-medium">Subjek<select name="subjectId" className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2">{subjects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><button disabled={pending} className="self-end rounded-md bg-teal-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Tetapkan</button><div className="sm:col-span-3"><Message state={state} /></div></form>;
}

function ArchiveButton({ id, kind, active }: { id: string; kind: "class" | "subject" | "assignment"; active: boolean }) {
  const [state, action, pending] = useActionState(archivePbdSetupAction, initialState);
  return <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="restore" value={active ? "false" : "true"} /><button disabled={pending} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-stone-100 disabled:opacity-60">{active ? "Archive" : "Restore"}</button><Message state={state} /></form>;
}

function DeleteButton({ id, kind, name }: { id: string; kind: "class" | "subject"; name: string }) {
  const [state, action, pending] = useActionState(deletePbdSetupAction, initialState); const label = kind === "class" ? "kelas" : "subjek";
  return <Dialog.Root><Dialog.Trigger asChild><button type="button" className="rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-800 hover:bg-rose-50">Delete</button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.18)] outline-none"><Dialog.Title className="text-lg font-semibold text-slate-950">Delete {label}?</Dialog.Title><Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">{name} akan dipadam secara kekal. Tindakan ini tidak boleh dipulihkan.</Dialog.Description><form action={action} className="mt-5 flex flex-wrap justify-end gap-3"><input type="hidden" name="id" value={id} /><input type="hidden" name="kind" value={kind} /><Dialog.Close asChild><button type="button" className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-slate-800">Cancel</button></Dialog.Close><button disabled={pending} className="rounded-md bg-rose-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{pending ? "Deleting…" : "Delete permanently"}</button></form><Message state={state} /></Dialog.Content></Dialog.Portal></Dialog.Root>;
}

function EnrollmentForm({ id, enrolledCount }: { id: string; enrolledCount: number }) {
  const [state, action, pending] = useActionState(updatePbdClassEnrollmentAction, initialState);
  return <form action={action} className="flex items-end gap-2"><input type="hidden" name="classId" value={id} /><label className="text-xs font-medium text-slate-600">Jumlah murid<input name="enrolledCount" defaultValue={enrolledCount} type="number" min="0" className="mt-1 block w-24 rounded-md border border-stone-300 px-2 py-1.5 text-sm" /></label><button disabled={pending} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50">Simpan</button><Message state={state} /></form>;
}

function TeacherNameForm({ id, teacherName }: { id: string; teacherName: string | null }) {
  const [state, action, pending] = useActionState(updatePbdClassTeacherAction, initialState);
  return <form action={action} className="flex items-end gap-2"><input type="hidden" name="classId" value={id} /><label className="text-xs font-medium text-slate-600">Guru kelas<input name="teacherName" defaultValue={teacherName ?? ""} className="mt-1 block w-44 rounded-md border border-stone-300 px-2 py-1.5 text-sm" placeholder="Nama guru" /></label><button disabled={pending} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50">Simpan</button><Message state={state} /></form>;
}

function Archived({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  if (!count) return null;
  return <details className="border-t border-stone-200"><summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700 sm:px-5">{label} ({count})</summary><div className="divide-y divide-stone-200 border-t border-stone-200 bg-stone-50/70">{children}</div></details>;
}

function ClassRow({ item }: { item: DatabasePbdSetup["classes"][number] }) {
  return <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"><div className="min-w-0"><p className="font-medium text-slate-950">{item.name}</p><p className="text-sm text-slate-600">{item.enrolledCount} murid · Guru: {item.teacherName || "Belum ditetapkan"}</p></div><div className="flex flex-wrap items-end gap-2">{item.active ? <TeacherNameForm id={item.id} teacherName={item.teacherName} /> : null}{item.active ? <EnrollmentForm id={item.id} enrolledCount={item.enrolledCount} /> : null}<ArchiveButton id={item.id} kind="class" active={item.active} />{item.canDelete ? <DeleteButton id={item.id} kind="class" name={item.name} /> : null}</div></div>;
}

function SubjectRow({ item }: { item: DatabasePbdSetup["subjects"][number] }) {
  return <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"><p className="min-w-0 font-medium text-slate-950"><span className="font-semibold">{item.code}</span> · {item.name}</p><div className="flex flex-wrap gap-2"><ArchiveButton id={item.id} kind="subject" active={item.active} />{item.canDelete ? <DeleteButton id={item.id} kind="subject" name={`${item.code} · ${item.name}`} /> : null}</div></div>;
}

function AssignmentRows({ rows }: { rows: DatabasePbdSetup["rows"] }) {
  const groups = Array.from(new Map(rows.map((row) => [row.subjectId, { code: row.subjectCode, name: row.subjectName, rows: rows.filter((item) => item.subjectId === row.subjectId) }])).values()).sort((a, b) => a.code.localeCompare(b.code, "ms"));
  return <div className="divide-y divide-stone-200">{groups.map((group) => <section key={`${group.code}-${group.name}`} className="grid gap-2 px-4 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:px-5"><div><h3 className="font-semibold text-slate-950">{group.code}</h3><p className="text-sm text-slate-600">{group.name}</p></div><div className="divide-y divide-stone-200">{group.rows.map((row) => <div key={row.classSubjectId} className="flex min-w-0 items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"><span className="min-w-0 truncate text-sm font-medium text-slate-800">{row.className}</span><ArchiveButton id={row.classSubjectId} kind="assignment" active={row.active} /></div>)}</div></section>)}</div>;
}

export function SchoolSetupWorkspace({ setup, registry, year, semester, view }: { setup: DatabasePbdSetup; registry: SchoolRegistry; year: string; semester: "1" | "2"; view: PbdSetupView }) {
  const counts = pbdSetupCounts(setup); const activeClasses = setup.classes.filter((item) => item.active); const archivedClasses = setup.classes.filter((item) => !item.active); const activeSubjects = setup.subjects.filter((item) => item.active); const archivedSubjects = setup.subjects.filter((item) => !item.active); const activeRows = setup.rows.filter((row) => row.active); const archivedRows = setup.rows.filter((row) => !row.active);
  const tabs: Array<{ id: PbdSetupView; label: string; count: number }> = [{ id: "classes", label: "Kelas", count: counts.classes }, { id: "pupils", label: "Murid", count: registry.enrollments.filter((item) => item.active).length }, { id: "subjects", label: "Subjek", count: counts.subjects }, { id: "assignments", label: "Penetapan", count: counts.assignments }];
  return <div className="mt-6 min-w-0 space-y-5">
    <section className="rounded-lg bg-stone-100 px-4 py-4 sm:px-5"><div className="flex min-w-0 flex-wrap items-center justify-between gap-4"><nav aria-label="Bahagian Setup Sekolah" className="flex flex-wrap gap-2">{tabs.map((tab) => <Link key={tab.id} href={`/school/setup?year=${year}&semester=${semester}&view=${tab.id}`} aria-current={view === tab.id ? "page" : undefined} className={`rounded-md px-3 py-2 text-sm font-medium ${view === tab.id ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-stone-200"}`} style={view === tab.id ? { color: "white" } : undefined}>{tab.label} <span className="ml-1 tabular-nums">{tab.count}</span></Link>)}</nav><p className="text-sm text-slate-600">Tahun akademik {year}</p></div></section>
    {view === "classes" ? <section className="rounded-lg bg-white"><div className="p-4 sm:p-5"><h2 className="text-lg font-semibold">Kelas</h2><p className="mt-1 text-sm text-slate-600">Jumlah murid menjadi rujukan bagi semua subjek kelas.</p><div className="mt-4"><AddClass year={year} /></div></div><div className="divide-y divide-stone-200 border-t border-stone-200">{activeClasses.length ? activeClasses.map((item) => <ClassRow key={item.id} item={item} />) : <p className="px-4 py-5 text-sm text-slate-600 sm:px-5">Belum ada kelas aktif.</p>}</div><Archived label="Kelas diarkibkan" count={archivedClasses.length}>{archivedClasses.map((item) => <ClassRow key={item.id} item={item} />)}</Archived></section> : null}
    {view === "pupils" ? <SchoolRosterWorkspace setup={setup} registry={registry} year={year} /> : null}
    {view === "subjects" ? <section className="rounded-lg bg-white"><div className="p-4 sm:p-5"><h2 className="text-lg font-semibold">Subjek</h2><p className="mt-1 text-sm text-slate-600">Tambah subjek sekali, kemudian tetapkan kepada kelas yang berkaitan.</p><div className="mt-4"><AddSubject /></div></div><div className="divide-y divide-stone-200 border-t border-stone-200">{activeSubjects.length ? activeSubjects.map((item) => <SubjectRow key={item.id} item={item} />) : <p className="px-4 py-5 text-sm text-slate-600 sm:px-5">Belum ada subjek aktif.</p>}</div><Archived label="Subjek diarkibkan" count={archivedSubjects.length}>{archivedSubjects.map((item) => <SubjectRow key={item.id} item={item} />)}</Archived></section> : null}
    {view === "assignments" ? <section className="rounded-lg bg-white"><div className="p-4 sm:p-5"><h2 className="text-lg font-semibold">Penetapan kelas-subjek</h2><p className="mt-1 text-sm text-slate-600">Pilih kelas dan subjek. Setiap pasangan hanya perlu ditetapkan sekali.</p><div className="mt-4"><Assignment setup={setup} year={year} semester={semester} /></div></div><div className="border-t border-stone-200">{activeRows.length ? <AssignmentRows rows={activeRows} /> : <p className="px-4 py-5 text-sm text-slate-600 sm:px-5">Belum ada penetapan aktif.</p>}</div><Archived label="Penetapan diarkibkan" count={archivedRows.length}><AssignmentRows rows={archivedRows} /></Archived></section> : null}
    <p className="text-sm text-slate-600">Selesai setup? <Link className="font-medium text-teal-900" href={`/pbd/entry?year=${year}&semester=${semester}`}>Buka Isi Rumusan TP</Link></p>
  </div>;
}

export const PbdSetupWorkspace = SchoolSetupWorkspace;
