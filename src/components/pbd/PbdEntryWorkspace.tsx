"use client";

import { useActionState } from "react";
import type { DatabasePbdSetup } from "@/lib/db/pbd";
import {
  assignPbdSubjectAction,
  createPbdClassAction,
  createPbdSubjectAction,
  savePbdEntryAction,
  type PbdActionState,
} from "@/app/pbd/entry/actions";

const initialState: PbdActionState = {};
const bands = ["tp1", "tp2", "tp3", "tp4", "tp5", "tp6"] as const;

function ActionMessage({ state }: { state: PbdActionState }) {
  if (state.error) return <p className="mt-3 text-sm font-medium text-rose-700" role="alert">{state.error}</p>;
  if (state.success) return <p className="mt-3 text-sm font-medium text-teal-800" role="status">{state.success}</p>;
  return null;
}

function AddClassForm({ year }: { year: string }) {
  const [state, action, pending] = useActionState(createPbdClassAction, initialState);
  return (
    <form action={action} className="grid gap-3 rounded-lg bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
      <input type="hidden" name="year" value={year} />
      <label className="text-sm font-medium">Nama kelas<input name="name" required placeholder="4 Amanah" className="mt-1 w-full rounded-md border bg-white px-3 py-2" /></label>
      <label className="text-sm font-medium">Peringkat<select name="levelKind" defaultValue="tahun" className="mt-1 w-full rounded-md border bg-white px-3 py-2"><option value="tahun">Tahun</option><option value="tingkatan">Tingkatan</option><option value="peralihan">Peralihan</option></select></label>
      <label className="text-sm font-medium">Tahun/Tingkatan<input name="levelNumber" type="number" min="1" max="6" defaultValue="1" className="mt-1 w-full rounded-md border bg-white px-3 py-2" /></label>
      <label className="text-sm font-medium">Jumlah murid<input name="enrolledCount" type="number" min="0" required className="mt-1 w-full rounded-md border bg-white px-3 py-2" /></label>
      <button disabled={pending} className="self-end rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Tambah kelas</button>
      <div className="sm:col-span-2 lg:col-span-5"><ActionMessage state={state} /></div>
    </form>
  );
}

function AddSubjectForm() {
  const [state, action, pending] = useActionState(createPbdSubjectAction, initialState);
  return (
    <form action={action} className="grid gap-3 rounded-lg bg-stone-50 p-4 sm:grid-cols-[10rem_1fr_auto]">
      <label className="text-sm font-medium">Kod subjek<input name="code" required placeholder="BM" className="mt-1 w-full rounded-md border bg-white px-3 py-2 uppercase" /></label>
      <label className="text-sm font-medium">Nama subjek<input name="name" required placeholder="Bahasa Melayu" className="mt-1 w-full rounded-md border bg-white px-3 py-2" /></label>
      <button disabled={pending} className="self-end rounded-md border border-teal-800 px-4 py-2 text-sm font-medium text-teal-900 disabled:opacity-60">Tambah subjek</button>
      <div className="sm:col-span-3"><ActionMessage state={state} /></div>
    </form>
  );
}

function AssignSubjectForm({ setup, year, semester }: { setup: DatabasePbdSetup; year: string; semester: "1" | "2" }) {
  const [state, action, pending] = useActionState(assignPbdSubjectAction, initialState);
  if (!setup.classes.length || !setup.subjects.length) return <p className="text-sm text-slate-600">Tambah sekurang-kurangnya satu kelas dan satu subjek dahulu.</p>;
  return (
    <form action={action} className="grid gap-3 rounded-lg bg-stone-50 p-4 sm:grid-cols-[1fr_1fr_auto]">
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="semester" value={semester} />
      <label className="text-sm font-medium">Kelas<select name="classId" className="mt-1 w-full rounded-md border bg-white px-3 py-2">{setup.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-medium">Subjek<select name="subjectId" className="mt-1 w-full rounded-md border bg-white px-3 py-2">{setup.subjects.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}</select></label>
      <button disabled={pending} className="self-end rounded-md border border-teal-800 px-4 py-2 text-sm font-medium text-teal-900 disabled:opacity-60">Tetapkan</button>
      <div className="sm:col-span-3"><ActionMessage state={state} /></div>
    </form>
  );
}

function EntryForm({ row, year, semester }: { row: DatabasePbdSetup["rows"][number]; year: string; semester: "1" | "2" }) {
  const [state, action, pending] = useActionState(savePbdEntryAction, initialState);
  const entry = row.entry;
  const totals = entry
    ? Object.values(entry.counts).reduce<number>((sum, value) => sum + (value ?? 0), 0) + (entry.notAssessedCount ?? 0)
    : 0;
  return (
    <form action={action} className="grid gap-3 border-t px-5 py-4 md:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_5rem_repeat(7,4rem)_minmax(10rem,1fr)] md:items-end">
      <input type="hidden" name="classSubjectId" value={row.classSubjectId} />
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="semester" value={semester} />
      <input type="hidden" name="revision" value={entry?.revision ?? 0} />
      <div><p className="font-medium">{row.className}</p></div>
      <div><p className="font-medium">{row.subjectCode}</p><p className="text-xs text-slate-500">{row.subjectName}</p></div>
      <label className="text-xs font-medium text-slate-600">Murid<input name="enrolledCount" type="number" min="0" defaultValue={entry?.enrolledCount ?? row.enrolledCount} className="mt-1 w-full rounded border bg-white px-2 py-1.5 text-sm" /></label>
      {bands.map((band, index) => <label key={band} className="text-xs font-medium text-slate-600">TP{index + 1}<input name={band} type="number" min="0" defaultValue={entry?.counts[`TP${index + 1}` as keyof typeof entry.counts] ?? ""} className="mt-1 w-full rounded border bg-white px-2 py-1.5 text-sm" /></label>)}
      <label className="text-xs font-medium text-slate-600">Belum<input name="notAssessed" type="number" min="0" defaultValue={entry?.notAssessedCount ?? ""} className="mt-1 w-full rounded border bg-white px-2 py-1.5 text-sm" /></label>
      <div><p className="text-xs font-medium text-slate-600">Status</p><p className="mt-2 text-sm text-slate-600">{entry ? `${entry.status === "final" ? "Muktamad" : "Draf"} · ${totals}/${entry.enrolledCount}` : "Belum diisi"}</p><div className="mt-2 flex gap-2"><button name="action" value="save_draft" disabled={pending} className="rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-60">Simpan</button><button name="action" value={entry?.status === "final" ? "reopen" : "finalize"} disabled={pending} className="rounded-md bg-teal-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">{entry?.status === "final" ? "Buka semula" : "Muktamad"}</button></div><ActionMessage state={state} /></div>
    </form>
  );
}

export function PbdEntryWorkspace({ setup, year, semester }: { setup: DatabasePbdSetup; year: string; semester: "1" | "2" }) {
  return (
    <div className="mt-6 space-y-8">
      <section>
        <h2 className="text-lg font-semibold">1. Tambah kelas</h2>
        <p className="mt-1 text-sm text-slate-600">Setiap kelas mempunyai jumlah murid yang digunakan untuk semakan TP.</p>
        <div className="mt-3"><AddClassForm year={year} /></div>
      </section>
      <section>
        <h2 className="text-lg font-semibold">2. Tambah subjek</h2>
        <p className="mt-1 text-sm text-slate-600">Gunakan satu kod yang konsisten untuk setiap subjek sekolah.</p>
        <div className="mt-3"><AddSubjectForm /></div>
      </section>
      <section>
        <h2 className="text-lg font-semibold">3. Tetapkan subjek kepada kelas</h2>
        <div className="mt-3"><AssignSubjectForm setup={setup} year={year} semester={semester} /></div>
      </section>
      <section className="overflow-hidden rounded-lg border bg-white">
        <div className="border-b px-5 py-4"><h2 className="text-lg font-semibold">4. Isi rumusan TP</h2><p className="mt-1 text-sm text-slate-600">Simpan draf semasa mengisi. Muktamadkan hanya apabila jumlah TP dan murid belum ditaksir sepadan dengan jumlah murid.</p></div>
        {setup.rows.length ? <div>{setup.rows.map((row) => <EntryForm key={row.classSubjectId} row={row} year={year} semester={semester} />)}</div> : <p className="px-5 py-6 text-sm text-slate-600">Tetapkan subjek kepada kelas untuk membuka jadual pengisian.</p>}
      </section>
    </div>
  );
}
