"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DatabasePbdSetup } from "@/lib/db/pbd";
import { savePbdClassEntriesAction, type PbdActionState } from "@/app/pbd/entry/actions";

const initialState: PbdActionState = {};
const fields = ["tp1", "tp2", "tp3", "tp4", "tp5", "tp6", "notAssessed"] as const;

function total(row: DatabasePbdSetup["rows"][number]) {
  const entry = row.entry;
  return entry ? Object.values(entry.counts).reduce<number>((sum, value) => sum + (value ?? 0), 0) + (entry.notAssessedCount ?? 0) : 0;
}

export function PbdEntryWorkspace({ setup, year, semester, selectedClassId }: { setup: DatabasePbdSetup; year: string; semester: "1" | "2"; selectedClassId: string | null }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [state, action, pending] = useActionState(async (previousState: PbdActionState, formData: FormData) => {
    const nextState = await savePbdClassEntriesAction(previousState, formData);
    if (nextState.success) setDirty(false);
    return nextState;
  }, initialState);
  const selectedClass = setup.classes.find((item) => item.id === selectedClassId && item.active) ?? setup.classes.find((item) => item.active) ?? null;
  const rows = selectedClass ? setup.rows.filter((row) => row.classId === selectedClass.id && row.active) : [];

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  function switchClass(nextClassId: string) {
    if (nextClassId === selectedClass?.id) return;
    if (dirty && !window.confirm("Terdapat perubahan yang belum disimpan. Tukar kelas tanpa menyimpan?")) return;
    router.push(`/pbd/entry?year=${year}&semester=${semester}&classId=${nextClassId}`);
  }

  if (!selectedClass) {
    return <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6"><h2 className="text-lg font-semibold">Belum ada kelas aktif</h2><p className="mt-2 text-sm text-slate-600">Tambahkan kelas dan tetapkan subjek dahulu dalam PBD Setup.</p><Link className="mt-4 inline-block rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white" href={`/pbd/setup?year=${year}&semester=${semester}`}>Buka PBD Setup</Link></section>;
  }

  return (
    <div className="mt-6 min-w-0 space-y-5">
      <section className="rounded-lg border border-stone-200 bg-white p-4 sm:p-5">
        <label className="block max-w-md text-sm font-medium text-slate-700">Pilih kelas
          <select value={selectedClass.id} onChange={(event) => switchClass(event.target.value)} className="mt-1.5 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-base">
            {setup.classes.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.enrolledCount} murid</option>)}
          </select>
        </label>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-semibold text-slate-900">{selectedClass.name}</h2><p className="mt-1 text-sm text-slate-600">{selectedClass.enrolledCount} murid · Semester {semester} · {year}</p></div>
          <Link href={`/pbd/setup?year=${year}&semester=${semester}`} className="text-sm font-medium text-teal-800 hover:text-teal-950">Urus kelas dan subjek</Link>
        </div>
      </section>

      {rows.length === 0 ? <section className="rounded-lg border border-stone-200 bg-white p-6"><h2 className="text-lg font-semibold">Tiada subjek untuk kelas ini</h2><p className="mt-2 text-sm text-slate-600">Tetapkan satu atau lebih subjek kepada {selectedClass.name} untuk mula mengisi rumusan TP.</p><Link href={`/pbd/setup?year=${year}&semester=${semester}`} className="mt-4 inline-block rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white">Tetapkan subjek</Link></section> : (
        <form ref={formRef} action={action} onInput={() => setDirty(true)} className="min-w-0">
          <input type="hidden" name="classId" value={selectedClass.id} /><input type="hidden" name="year" value={year} /><input type="hidden" name="semester" value={semester} />
          <section className="rounded-lg border border-stone-200 bg-white">
            <div className="px-4 py-4 sm:px-5"><h2 className="text-lg font-semibold">Isi rumusan TP</h2><p className="mt-1 text-sm text-slate-600">Isi semua subjek bagi kelas ini. Rekod muktamad hanya boleh dibuka semula dengan tindakan yang jelas.</p></div>
            <div className="border-t border-stone-200">
              {rows.map((row) => {
                const entry = row.entry;
                const finalized = entry?.status === "final";
                const counted = total(row);
                const required = entry?.enrolledCount ?? selectedClass.enrolledCount;
                const complete = Boolean(entry && Object.values(entry.counts).every((value) => value !== null) && entry.notAssessedCount !== null);
                return <article key={row.classSubjectId} className="min-w-0 border-b border-stone-200 p-4 last:border-b-0 sm:p-5">
                  <input type="hidden" name="classSubjectId" value={row.classSubjectId} />
                  <input type="hidden" name={`revision:${row.classSubjectId}`} value={entry?.revision ?? 0} />
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold text-slate-900">{row.subjectCode}</h3><p className="truncate text-sm text-slate-600">{row.subjectName}</p></div><p className={`text-sm font-medium ${finalized ? "text-slate-700" : complete && counted === required ? "text-teal-800" : "text-amber-800"}`}>{finalized ? `Muktamad · ${entry.enrolledCount} murid` : complete && counted === required ? "Sedia untuk muktamad" : `Draf · ${counted}/${required}`}</p></div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                    {fields.map((field, index) => {
                      const value = field === "notAssessed" ? entry?.notAssessedCount : entry?.counts[`TP${index + 1}` as keyof NonNullable<typeof entry>["counts"]];
                      return <label key={field} className="text-xs font-medium text-slate-600">{field === "notAssessed" ? "Belum ditaksir" : `TP${index + 1}`}<input readOnly={finalized} aria-readonly={finalized} name={`${field}:${row.classSubjectId}`} type="number" min="0" defaultValue={value ?? ""} className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-2.5 py-2 text-base text-slate-900 read-only:cursor-not-allowed read-only:bg-stone-100 read-only:text-slate-600" /></label>;
                    })}
                  </div>
                  <div className="mt-4 flex flex-col gap-3 border-t border-stone-100 pt-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-600">Jumlah diisi: <span className="font-medium text-slate-900">{counted}</span> · Diperlukan: <span className="font-medium text-slate-900">{required}</span>{counted !== required && !finalized ? <span className="ml-2 text-amber-800">Semak jumlah TP.</span> : null}</p><button type="submit" name="intent" value={finalized ? "reopen" : "finalize"} onClick={() => { const control = formRef.current?.querySelector<HTMLInputElement>("input[name='targetClassSubjectId']"); if (control) control.value = row.classSubjectId; }} disabled={pending} className="w-full rounded-md border border-teal-800 px-4 py-2 text-sm font-medium text-teal-900 disabled:opacity-60 sm:w-auto">{finalized ? "Simpan & buka semula" : "Simpan & muktamad"}</button></div>
                </article>;
              })}
            </div>
          </section>
          <input type="hidden" name="targetClassSubjectId" value="" />
          <div className="sticky bottom-0 z-10 mt-5 border border-stone-300 bg-white/95 p-3 backdrop-blur-sm sm:flex sm:items-center sm:justify-between"><div className="min-w-0 text-sm text-slate-600">{state.error ? <span className="font-medium text-rose-700" role="alert">{state.error}</span> : state.success ? <span className="font-medium text-teal-800" role="status">{state.success}{state.savedAt ? ` ${state.savedAt}.` : ""}</span> : dirty ? "Perubahan belum disimpan." : "Semua perubahan telah disimpan."}</div><button type="submit" name="intent" value="save" disabled={pending} className="mt-3 w-full rounded-md bg-teal-800 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 sm:mt-0 sm:w-auto">{pending ? "Menyimpan…" : "Simpan semua draf"}</button></div>
        </form>
      )}
    </div>
  );
}
