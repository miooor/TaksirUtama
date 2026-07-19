"use client";

import { useActionState } from "react";
import { addRosterStudentAction, archiveRosterStudentAction, commitRosterImportAction, previewRosterImportAction, updateRosterStudentAction, type RosterActionState } from "@/app/school/setup/actions";
import type { DatabasePbdSetup } from "@/lib/db/pbd";
import type { SchoolRegistry, StudentClassEnrollment } from "@/types/registry";

const initialState: RosterActionState = {};

function Message({ state }: { state: RosterActionState }) {
  return state.error ? <p className="text-sm font-medium text-rose-700" role="alert">{state.error}</p>
    : state.success ? <p className="text-sm font-medium text-teal-800" role="status">{state.success}</p> : null;
}

function ImportRoster({ setup, year }: { setup: DatabasePbdSetup; year: string }) {
  const [previewState, previewAction, previewing] = useActionState(previewRosterImportAction, initialState);
  const [commitState, commitAction, committing] = useActionState(commitRosterImportAction, initialState);
  const activeClasses = setup.classes.filter((item) => item.active);
  return <section className="rounded-lg bg-white p-4 sm:p-5">
    <h2 className="text-lg font-semibold text-slate-950">Import roster sekolah</h2>
    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Muat naik Excel atau CSV dengan lajur NAMA_MURID dan KELAS, atau tampal satu nama bagi setiap baris untuk sebuah kelas.</p>
    <form action={previewAction} className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
      <input type="hidden" name="year" value={year} />
      <label className="grid min-w-0 gap-1 text-sm font-medium">Fail seluruh sekolah (.xlsx atau .csv)
        <input name="file" type="file" accept=".xlsx,.csv" className="min-w-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm" />
      </label>
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        <label className="grid gap-1 text-sm font-medium">Kelas untuk tampalan
          <select name="className" className="rounded-md border border-stone-300 bg-white px-3 py-2">
            <option value="">Pilih kelas</option>{activeClasses.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-medium">Tampal nama
          <textarea name="paste" rows={4} className="min-w-0 resize-y rounded-md border border-stone-300 px-3 py-2 font-normal" placeholder={"1\tNUR AINA\n2\tKUMAR RAJ"} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 lg:col-span-2"><button disabled={previewing} className="action-primary text-sm">{previewing ? "Menyemak…" : "Pratonton import"}</button><Message state={previewState} /></div>
    </form>
    {previewState.preview ? <div className="mt-5 min-w-0 border-t border-stone-200 pt-5">
      <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <p><strong className="block text-xl tabular-nums">{previewState.preview.createCount}</strong>Akan ditambah</p>
        <p><strong className="block text-xl tabular-nums">{previewState.preview.matchCount}</strong>Sedia ada</p>
        <p><strong className="block text-xl tabular-nums text-amber-800">{previewState.preview.warningCount}</strong>Amaran</p>
        <p><strong className="block text-xl tabular-nums text-rose-700">{previewState.preview.errorCount}</strong>Ralat</p>
      </div>
      <div className="mt-4 max-h-72 overflow-auto rounded-md bg-stone-50">
        <table className="w-full min-w-[40rem] text-left text-sm"><thead className="sticky top-0 bg-stone-100"><tr><th className="px-3 py-2">Baris</th><th className="px-3 py-2">Murid</th><th className="px-3 py-2">Kelas</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Catatan</th></tr></thead><tbody>{previewState.preview.rows.map((row) => <tr key={row.rowNumber} className="border-t border-stone-200"><td className="px-3 py-2 tabular-nums">{row.rowNumber}</td><td className="px-3 py-2 font-medium">{row.displayName}</td><td className="px-3 py-2">{row.className}</td><td className="px-3 py-2">{row.status}</td><td className="px-3 py-2 text-slate-600">{row.message}</td></tr>)}</tbody></table>
      </div>
      {previewState.rowsJson && previewState.preview.errorCount === 0 ? <form action={commitAction} className="mt-4 flex flex-wrap items-center gap-3"><input type="hidden" name="year" value={year} /><input type="hidden" name="rowsJson" value={previewState.rowsJson} /><button disabled={committing} className="action-primary text-sm">{committing ? "Mengimport…" : "Sahkan import"}</button><Message state={commitState} /></form> : <p className="mt-4 text-sm font-medium text-rose-700">Betulkan semua ralat sebelum import boleh disahkan.</p>}
    </div> : null}
  </section>;
}

function RosterRow({ item }: { item: StudentClassEnrollment }) {
  const [editState, editAction, editing] = useActionState(updateRosterStudentAction, initialState);
  const [archiveState, archiveAction, archiving] = useActionState(archiveRosterStudentAction, initialState);
  return <div className="grid min-w-0 gap-3 px-4 py-3 md:grid-cols-[4rem_minmax(0,1fr)_9rem_auto] md:items-start sm:px-5">
    <p className="text-sm tabular-nums text-slate-600">{item.rosterNumber ?? "–"}</p>
    <div className="min-w-0"><p className="break-words font-medium text-slate-950">{item.student.displayName}</p><p className="mt-0.5 text-xs text-slate-600">{item.student.pupilCode ?? "Tiada kod murid"}</p></div>
    <p className={`text-sm font-medium ${item.active ? "text-teal-800" : "text-slate-500"}`}>{item.active ? "Aktif" : "Diarkibkan"}</p>
    <div className="flex min-w-0 flex-wrap gap-2 md:justify-end">
      {item.active ? <details className="relative"><summary className="cursor-pointer list-none rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium">Edit</summary><form action={editAction} className="mt-2 grid w-full min-w-[17rem] gap-3 rounded-md bg-stone-50 p-3 md:absolute md:right-0 md:z-10 md:w-80"><input type="hidden" name="enrollmentId" value={item.id} /><label className="text-xs font-medium">Nama<input name="displayName" required defaultValue={item.student.displayName} className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm" /></label><div className="grid grid-cols-2 gap-2"><label className="text-xs font-medium">Kod murid<input name="pupilCode" defaultValue={item.student.pupilCode ?? ""} className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm" /></label><label className="text-xs font-medium">Bil<input name="rosterNumber" type="number" min="1" defaultValue={item.rosterNumber ?? ""} className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm" /></label></div><button disabled={editing} className="action-primary text-sm">Simpan perubahan</button><Message state={editState} /></form></details> : null}
      <form action={archiveAction}><input type="hidden" name="enrollmentId" value={item.id} /><input type="hidden" name="restore" value={item.active ? "false" : "true"} /><button disabled={archiving} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium">{item.active ? "Archive" : "Restore"}</button><Message state={archiveState} /></form>
    </div>
  </div>;
}

function AddRosterStudent({ year, className }: { year: string; className: string }) {
  const [state, action, pending] = useActionState(addRosterStudentAction, initialState);
  return <details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-teal-900">Tambah murid secara manual</summary><form action={action} className="mt-3 grid min-w-0 gap-3 rounded-md bg-white p-3 sm:grid-cols-[minmax(0,1fr)_9rem_7rem_auto]"><input type="hidden" name="year" value={year} /><input type="hidden" name="className" value={className} /><label className="text-xs font-medium">Nama murid<input required name="displayName" className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label><label className="text-xs font-medium">Kod murid<input name="pupilCode" className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label><label className="text-xs font-medium">Bil<input name="rosterNumber" type="number" min="1" className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label><button disabled={pending} className="self-end rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{pending ? "Menyimpan…" : "Tambah"}</button><div className="sm:col-span-4"><Message state={state} /></div></form></details>;
}

export function SchoolRosterWorkspace({ setup, registry, year }: { setup: DatabasePbdSetup; registry: SchoolRegistry; year: string }) {
  const groups = setup.classes.filter((item) => item.active).map((classItem) => {
    const enrollments = registry.enrollments.filter((item) => item.classId === classItem.id);
    const activeCount = enrollments.filter((item) => item.active).length;
    return { classItem, enrollments, activeCount };
  });
  return <div className="space-y-5"><ImportRoster setup={setup} year={year} />
    <section className="rounded-lg bg-white"><div className="p-4 sm:p-5"><h2 className="text-lg font-semibold">Murid mengikut kelas</h2><p className="mt-1 text-sm text-slate-600">Roster ini dikongsi oleh PBD, intervensi, dan aliran UPSA/UASA akan datang.</p></div>
      {groups.length ? <div className="divide-y divide-stone-200 border-t border-stone-200">{groups.map(({ classItem, enrollments, activeCount }) => <section id={`class-${classItem.id}`} key={classItem.id} className="scroll-mt-6"><div className="bg-stone-50 px-4 py-3 sm:px-5"><div className="flex min-w-0 flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-950">{classItem.name}</h3><p className={`text-sm ${activeCount === classItem.enrolledCount ? "text-slate-600" : "font-medium text-amber-800"}`}>{activeCount} dalam roster · {classItem.enrolledCount} jumlah murid{activeCount === classItem.enrolledCount ? "" : " · Tidak sepadan"}</p></div></div><AddRosterStudent year={year} className={classItem.name} /></div>{enrollments.length ? <div className="divide-y divide-stone-200">{enrollments.map((item) => <RosterRow key={item.id} item={item} />)}</div> : <p className="px-4 py-4 text-sm text-slate-600 sm:px-5">Belum ada murid dalam roster kelas ini.</p>}</section>)}</div> : <p className="border-t border-stone-200 px-4 py-5 text-sm text-slate-600">Tambah kelas dahulu sebelum mengimport murid.</p>}
    </section>
  </div>;
}
