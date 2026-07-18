"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { DatabasePbdSetup } from "@/lib/db/pbd";
import { archivePbdSetupAction, assignPbdSubjectAction, createPbdClassAction, createPbdSubjectAction, updatePbdClassEnrollmentAction, type PbdActionState } from "@/app/pbd/entry/actions";

const initialState: PbdActionState = {};
function Message({ state }: { state: PbdActionState }) { return state.error ? <p className="mt-2 text-sm font-medium text-rose-700" role="alert">{state.error}</p> : state.success ? <p className="mt-2 text-sm font-medium text-teal-800" role="status">{state.success}</p> : null; }

function AddClass({ year }: { year: string }) {
  const [state, action, pending] = useActionState(createPbdClassAction, initialState);
  return <form action={action} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><input name="year" type="hidden" value={year} /><label className="text-sm font-medium">Nama kelas<input name="name" required className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2" placeholder="Tahun 1 Cemerlang" /></label><label className="text-sm font-medium">Peringkat<select name="levelKind" className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2"><option value="tahun">Tahun</option><option value="tingkatan">Tingkatan</option><option value="peralihan">Peralihan</option></select></label><label className="text-sm font-medium">Tahun/Tingkatan<input name="levelNumber" type="number" min="1" max="6" defaultValue="1" className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2" /></label><label className="text-sm font-medium">Jumlah murid<input name="enrolledCount" required type="number" min="0" className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2" /></label><button disabled={pending} className="self-end rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Tambah kelas</button><div className="sm:col-span-2 xl:col-span-5"><Message state={state} /></div></form>;
}

function AddSubject() {
  const [state, action, pending] = useActionState(createPbdSubjectAction, initialState);
  return <form action={action} className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto]"><label className="text-sm font-medium">Kod subjek<input name="code" required className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 uppercase" placeholder="BM" /></label><label className="text-sm font-medium">Nama subjek<input name="name" required className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2" placeholder="Bahasa Melayu" /></label><button disabled={pending} className="self-end rounded-md border border-teal-800 px-4 py-2 text-sm font-medium text-teal-900 disabled:opacity-60">Tambah subjek</button><div className="sm:col-span-3"><Message state={state} /></div></form>;
}

function Assignment({ setup, year, semester }: { setup: DatabasePbdSetup; year: string; semester: "1" | "2" }) {
  const [state, action, pending] = useActionState(assignPbdSubjectAction, initialState);
  const classes = setup.classes.filter((item) => item.active); const subjects = setup.subjects.filter((item) => item.active);
  if (!classes.length || !subjects.length) return <p className="text-sm text-slate-600">Tambah sekurang-kurangnya satu kelas dan satu subjek dahulu.</p>;
  return <form action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><input type="hidden" name="year" value={year} /><input type="hidden" name="semester" value={semester} /><label className="text-sm font-medium">Kelas<select name="classId" className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2">{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-medium">Subjek<select name="subjectId" className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2">{subjects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><button disabled={pending} className="self-end rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Tetapkan</button><div className="sm:col-span-3"><Message state={state} /></div></form>;
}

function ArchiveButton({ id, kind, active }: { id: string; kind: "class" | "subject" | "assignment"; active: boolean }) {
  const [state, action, pending] = useActionState(archivePbdSetupAction, initialState);
  return <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="restore" value={active ? "false" : "true"} /><button disabled={pending} className="text-sm font-medium text-slate-700 hover:text-slate-950 disabled:opacity-60">{active ? "Arkibkan" : "Pulihkan"}</button><Message state={state} /></form>;
}

function EnrollmentForm({ id, enrolledCount, active }: { id: string; enrolledCount: number; active: boolean }) {
  const [state, action, pending] = useActionState(updatePbdClassEnrollmentAction, initialState);
  return <form action={action} className="flex items-end gap-2"><input type="hidden" name="classId" value={id} /><label className="text-xs font-medium text-slate-600">Jumlah murid<input name="enrolledCount" disabled={!active} defaultValue={enrolledCount} type="number" min="0" className="mt-1 block w-24 rounded-md border border-stone-300 px-2 py-1.5 text-sm disabled:bg-stone-100" /></label><button disabled={!active || pending} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50">Simpan</button><Message state={state} /></form>;
}

export function PbdSetupWorkspace({ setup, year, semester }: { setup: DatabasePbdSetup; year: string; semester: "1" | "2" }) {
  return <div className="mt-6 min-w-0 space-y-6">
    <section className="rounded-lg border border-stone-200 bg-white p-4 sm:p-5"><h2 className="text-lg font-semibold">Tambah kelas</h2><p className="mt-1 text-sm text-slate-600">Jumlah murid menjadi nilai rujukan untuk draf baharu. Draf sedia ada akan diselaraskan apabila anda mengubahnya.</p><div className="mt-4"><AddClass year={year} /></div></section>
    <section className="rounded-lg border border-stone-200 bg-white p-4 sm:p-5"><h2 className="text-lg font-semibold">Tambah subjek</h2><div className="mt-4"><AddSubject /></div></section>
    <section className="rounded-lg border border-stone-200 bg-white p-4 sm:p-5"><h2 className="text-lg font-semibold">Tetapkan subjek kepada kelas</h2><p className="mt-1 text-sm text-slate-600">Gunakan satu tetapan bagi setiap pasangan kelas dan subjek.</p><div className="mt-4"><Assignment setup={setup} year={year} semester={semester} /></div></section>
    <section className="rounded-lg border border-stone-200 bg-white"><div className="p-4 sm:p-5"><h2 className="text-lg font-semibold">Kelas aktif dan arkib</h2><p className="mt-1 text-sm text-slate-600">Rekod yang mempunyai TP atau rekod muktamad dilindungi daripada arkib. Tiada padam kekal semasa pilot.</p></div><div className="divide-y divide-stone-200">{setup.classes.map((item) => <div key={item.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4 sm:px-5"><div className="min-w-0"><p className="font-medium text-slate-900">{item.name}</p><p className="text-sm text-slate-600">{item.enrolledCount} murid · {item.active ? "Aktif" : "Diarkibkan"}</p></div><div className="flex flex-wrap items-center gap-4"><EnrollmentForm id={item.id} enrolledCount={item.enrolledCount} active={item.active} /><ArchiveButton id={item.id} kind="class" active={item.active} /></div></div>)}</div></section>
    <section className="rounded-lg border border-stone-200 bg-white"><div className="p-4 sm:p-5"><h2 className="text-lg font-semibold">Subjek aktif dan arkib</h2></div><div className="divide-y divide-stone-200">{setup.subjects.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 p-4 sm:px-5"><div><p className="font-medium text-slate-900">{item.code} · {item.name}</p><p className="text-sm text-slate-600">{item.active ? "Aktif" : "Diarkibkan"}</p></div><ArchiveButton id={item.id} kind="subject" active={item.active} /></div>)}</div></section>
    <section className="rounded-lg border border-stone-200 bg-white"><div className="p-4 sm:p-5"><h2 className="text-lg font-semibold">Penetapan kelas-subjek</h2><p className="mt-1 text-sm text-slate-600">Untuk membetulkan penetapan, tambahkan penetapan yang betul dan arkibkan yang tidak digunakan.</p></div><div className="divide-y divide-stone-200">{setup.rows.map((row) => <div key={row.classSubjectId} className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4 sm:px-5"><div className="min-w-0"><p className="font-medium text-slate-900">{row.className} · {row.subjectCode}</p><p className="truncate text-sm text-slate-600">{row.subjectName} · {row.active ? "Aktif" : "Diarkibkan"}</p></div><ArchiveButton id={row.classSubjectId} kind="assignment" active={row.active} /></div>)}</div></section>
    <p className="text-sm text-slate-600">Sedia mengisi? <Link className="font-medium text-teal-800" href={`/pbd/entry?year=${year}&semester=${semester}`}>Buka Isi Rumusan TP</Link></p>
  </div>;
}
