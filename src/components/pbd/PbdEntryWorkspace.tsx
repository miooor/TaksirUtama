"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DatabasePbdSetup } from "@/lib/db/pbd";
import { savePbdSubjectEntriesAction, type PbdActionState } from "@/app/pbd/entry/actions";
import {
  emptySubjectEntryValues,
  fillSubjectEntryBlanks,
  revisionsMatch,
  subjectEntryBalance,
  subjectEntryFields,
  subjectEntryPercentage,
  subjectEntryRecoveryKey,
  subjectEntryState,
  subjectEntryTotal,
  type SubjectEntryField,
  type SubjectEntryFilter,
  type SubjectEntryValues,
} from "@/lib/pbd/subjectEntryWorkflow";

const initialState: PbdActionState = {};
type SetupRow = DatabasePbdSetup["rows"][number];
type ValuesByRow = Record<string, SubjectEntryValues>;
type RecoveryDraft = { revisions: Record<string, number>; values: ValuesByRow };

const filterLabels: Array<{ id: SubjectEntryFilter; label: string }> = [
  { id: "all", label: "Semua" }, { id: "empty", label: "Belum diisi" },
  { id: "mismatch", label: "Tidak sepadan" }, { id: "ready", label: "Sedia dimuktamadkan" },
  { id: "final", label: "Muktamad" },
];

function valuesFromRow(row: SetupRow): SubjectEntryValues {
  const entry = row.entry;
  if (!entry) return emptySubjectEntryValues();
  return {
    tp1: entry.counts.TP1?.toString() ?? "", tp2: entry.counts.TP2?.toString() ?? "",
    tp3: entry.counts.TP3?.toString() ?? "", tp4: entry.counts.TP4?.toString() ?? "",
    tp5: entry.counts.TP5?.toString() ?? "", tp6: entry.counts.TP6?.toString() ?? "",
    notAssessed: entry.notAssessedCount?.toString() ?? "",
  };
}

function levelLabel(row: SetupRow) {
  if (row.classLevelKind === "peralihan") return "Peralihan";
  const kind = row.classLevelKind === "tingkatan" ? "Tingkatan" : "Tahun";
  return row.classLevelNumber ? `${kind} ${row.classLevelNumber}` : kind;
}

function sortRows(rows: SetupRow[]) {
  const order = { tahun: 0, peralihan: 1, tingkatan: 2 };
  return [...rows].sort((a, b) => order[a.classLevelKind] - order[b.classLevelKind]
    || (a.classLevelNumber ?? 0) - (b.classLevelNumber ?? 0)
    || a.className.localeCompare(b.className, "ms"));
}

export function PbdEntryWorkspace({ setup, year, semester, selectedSubjectId }: { setup: DatabasePbdSetup; year: string; semester: "1" | "2"; selectedSubjectId: string | null }) {
  const router = useRouter();
  const targetRef = useRef<HTMLInputElement>(null);
  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState<SubjectEntryFilter>("all");
  const [recoveryDraft, setRecoveryDraft] = useState<RecoveryDraft | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const activeClassIds = useMemo(() => new Set(setup.classes.filter((item) => item.active).map((item) => item.id)), [setup.classes]);
  const activeSubjectIds = useMemo(() => new Set(setup.subjects.filter((item) => item.active).map((item) => item.id)), [setup.subjects]);
  const activeRows = useMemo(() => setup.rows.filter((row) => row.active && activeClassIds.has(row.classId) && activeSubjectIds.has(row.subjectId)), [setup.rows, activeClassIds, activeSubjectIds]);
  const eligibleSubjectIds = useMemo(() => new Set(activeRows.map((row) => row.subjectId)), [activeRows]);
  const eligibleSubjects = useMemo(() => setup.subjects.filter((item) => item.active && eligibleSubjectIds.has(item.id)), [setup.subjects, eligibleSubjectIds]);
  const selectedSubject = eligibleSubjects.find((item) => item.id === selectedSubjectId) ?? eligibleSubjects[0] ?? null;
  const rows = useMemo(() => sortRows(selectedSubject ? activeRows.filter((row) => row.subjectId === selectedSubject.id) : []), [activeRows, selectedSubject]);
  const initialValues = useMemo(() => Object.fromEntries(rows.map((row) => [row.classSubjectId, valuesFromRow(row)])) as ValuesByRow, [rows]);
  const [values, setValues] = useState<ValuesByRow>(initialValues);
  const revisions = useMemo(() => Object.fromEntries(rows.map((row) => [row.classSubjectId, row.entry?.revision ?? 0])), [rows]);
  const recoveryKey = selectedSubject ? subjectEntryRecoveryKey(setup.schoolId, year, semester, selectedSubject.id) : null;
  const [state, action, pending] = useActionState(async (previousState: PbdActionState, formData: FormData) => {
    const nextState = await savePbdSubjectEntriesAction(previousState, formData);
    if (nextState.success) {
      if (recoveryKey) sessionStorage.removeItem(recoveryKey);
      setDirty(false);
      setRecoveryDraft(null);
    }
    return nextState;
  }, initialState);

  useEffect(() => {
    if (!recoveryKey) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const raw = sessionStorage.getItem(recoveryKey);
      if (!raw) return;
      const recovered = JSON.parse(raw) as RecoveryDraft;
      const validValues = rows.every((row) => subjectEntryFields.every((field) => typeof recovered.values?.[row.classSubjectId]?.[field] === "string"));
      if (validValues && revisionsMatch(revisions, recovered.revisions ?? {})) {
        timer = setTimeout(() => setRecoveryDraft(recovered), 0);
      } else {
        sessionStorage.removeItem(recoveryKey);
        timer = setTimeout(() => setRecoveryNotice("Draf tempatan lama dibuang kerana rekod telah berubah."), 0);
      }
    } catch {
      sessionStorage.removeItem(recoveryKey);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [recoveryKey, revisions, rows]);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  function persist(nextValues: ValuesByRow) {
    if (recoveryKey) sessionStorage.setItem(recoveryKey, JSON.stringify({ revisions, values: nextValues } satisfies RecoveryDraft));
  }

  function updateField(rowId: string, field: SubjectEntryField, value: string) {
    setValues((current) => {
      const next = { ...current, [rowId]: { ...current[rowId], [field]: value } };
      persist(next);
      return next;
    });
    setDirty(true);
  }

  function switchSubject(subjectId: string) {
    if (subjectId === selectedSubject?.id) return;
    if (dirty && !window.confirm("Terdapat perubahan yang belum disimpan. Tukar subjek tanpa menyimpan?")) return;
    router.push(`/pbd/entry?year=${year}&semester=${semester}&subjectId=${subjectId}`);
  }

  function rowRequired(row: SetupRow) { return row.entry?.status === "final" ? row.entry.enrolledCount : row.enrolledCount; }
  function rowState(row: SetupRow) { return subjectEntryState(values[row.classSubjectId] ?? valuesFromRow(row), rowRequired(row), row.entry?.status === "final"); }
  const counts = Object.fromEntries(filterLabels.map(({ id }) => [id, id === "all" ? rows.length : rows.filter((row) => rowState(row) === id).length])) as Record<SubjectEntryFilter, number>;
  const visibleRows = rows.filter((row) => filter === "all" || rowState(row) === filter);
  const incompleteRows = rows.filter((row) => ["empty", "mismatch"].includes(rowState(row)));
  const totalPupils = rows.reduce((sum, row) => sum + rowRequired(row), 0);
  const groups = Array.from(new Set(rows.map(levelLabel))).map((label) => ({ label, rows: rows.filter((row) => levelLabel(row) === label) }));

  function handleEnter(event: React.KeyboardEvent<HTMLInputElement>, rowId: string, field: SubjectEntryField) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const editableVisibleRows = visibleRows.filter((row) => row.entry?.status !== "final");
    const currentIndex = editableVisibleRows.findIndex((row) => row.classSubjectId === rowId);
    const target = editableVisibleRows[currentIndex + (event.shiftKey ? -1 : 1)];
    if (target) document.getElementById(`pbd-${field}-${target.classSubjectId}`)?.focus();
  }

  function fillBlanks(rowId: string) {
    setValues((current) => {
      const next = { ...current, [rowId]: fillSubjectEntryBlanks(current[rowId]) };
      persist(next);
      return next;
    });
    setDirty(true);
  }

  function focusNextIncomplete() {
    const row = incompleteRows[0];
    if (!row) return;
    setFilter("all");
    setTimeout(() => {
      const firstBlank = subjectEntryFields.find((field) => values[row.classSubjectId][field] === "") ?? "tp1";
      const input = document.getElementById(`pbd-${firstBlank}-${row.classSubjectId}`);
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
      input?.focus();
    }, 0);
  }

  if (!selectedSubject) {
    return <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6"><h2 className="text-lg font-semibold">Belum ada subjek yang ditetapkan</h2><p className="mt-2 text-sm text-slate-600">Tetapkan subjek kepada sekurang-kurangnya satu kelas dalam PBD Setup.</p><Link className="mt-4 inline-block rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white" href={`/pbd/setup?year=${year}&semester=${semester}`}>Buka PBD Setup</Link></section>;
  }

  return <div className="mt-6 min-w-0 space-y-5">
    <section className="rounded-lg border border-stone-200 bg-white p-4 sm:p-5">
      <label className="block max-w-lg text-sm font-medium text-slate-700">Pilih subjek<select value={selectedSubject.id} onChange={(event) => switchSubject(event.target.value)} className="mt-1.5 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-base">{eligibleSubjects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
      <div className="mt-5 flex min-w-0 flex-wrap items-end justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-xl font-semibold text-slate-900">{selectedSubject.code} · {selectedSubject.name}</h2><p className="mt-1 text-sm text-slate-600">Semester {semester} · {year} · {rows.length} kelas · {totalPupils} murid</p></div><Link href={`/pbd/setup?year=${year}&semester=${semester}`} className="text-sm font-medium text-teal-800 hover:text-teal-950">Urus kelas dan subjek</Link></div>
    </section>

    {recoveryDraft ? <section className="rounded-lg border border-amber-300 bg-amber-50 p-4"><h2 className="font-semibold text-amber-950">Perubahan belum disimpan ditemui</h2><p className="mt-1 text-sm text-amber-900">Pulihkan nilai yang disimpan sementara dalam tab ini?</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => { setValues(recoveryDraft.values); setDirty(true); setRecoveryDraft(null); }} className="rounded-md bg-amber-900 px-3 py-2 text-sm font-medium text-white">Pulihkan perubahan</button><button type="button" onClick={() => { if (recoveryKey) sessionStorage.removeItem(recoveryKey); setRecoveryDraft(null); }} className="rounded-md border border-amber-400 px-3 py-2 text-sm font-medium text-amber-950">Buang draf tempatan</button></div></section> : null}
    {recoveryNotice ? <p className="text-sm text-slate-600" role="status">{recoveryNotice}</p> : null}

    <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6" aria-label="Ringkasan kemajuan subjek">
      {[{ label: "Kelas", value: rows.length }, { label: "Murid", value: totalPupils }, { label: "Belum diisi", value: counts.empty }, { label: "Tidak sepadan", value: counts.mismatch }, { label: "Sedia", value: counts.ready }, { label: "Muktamad", value: counts.final }].map((item) => <div key={item.label} className="rounded-md bg-stone-100 px-4 py-3"><p className="text-sm text-slate-600">{item.label}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{item.value}</p></div>)}
    </section>

    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap gap-1" aria-label="Tapis kelas">{filterLabels.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`rounded-md px-3 py-2 text-sm ${filter === item.id ? "bg-stone-200 font-semibold text-slate-950" : "text-slate-600 hover:bg-stone-100"}`}>{item.label} ({counts[item.id]})</button>)}</div>
      <button type="button" disabled={!incompleteRows.length} onClick={focusNextIncomplete} className="shrink-0 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-50">Kelas belum lengkap seterusnya</button>
    </div>

    <form action={action} className="min-w-0 pb-24">
      <input type="hidden" name="subjectId" value={selectedSubject.id} /><input type="hidden" name="year" value={year} /><input type="hidden" name="semester" value={semester} /><input ref={targetRef} type="hidden" name="targetClassSubjectId" value="" />
      <section className="rounded-lg border border-stone-200 bg-white"><div className="p-4 sm:p-5"><h2 className="text-lg font-semibold">Isi rumusan TP</h2><p className="mt-1 text-sm text-slate-600">Masukkan bilangan murid bagi setiap TP. Peratus dan baki dikira secara langsung.</p></div>
        {groups.map((group) => {
          const groupVisible = group.rows.some((row) => visibleRows.includes(row));
          return <section key={group.label} hidden={!groupVisible} className="border-t border-stone-200"><h3 className="bg-stone-50 px-4 py-3 font-semibold text-slate-900 sm:px-5">{group.label}</h3>{group.rows.map((row) => {
            const rowValues = values[row.classSubjectId] ?? valuesFromRow(row);
            const finalized = row.entry?.status === "final";
            const required = rowRequired(row);
            const total = subjectEntryTotal(rowValues);
            const balance = subjectEntryBalance(rowValues, required);
            const status = rowState(row);
            const visible = filter === "all" || status === filter;
            return <article key={row.classSubjectId} hidden={!visible} className="min-w-0 border-t border-stone-200 p-4 sm:p-5">
              <input type="hidden" name="classSubjectId" value={row.classSubjectId} /><input type="hidden" name={`revision:${row.classSubjectId}`} value={row.entry?.revision ?? 0} />
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h4 className="font-semibold text-slate-950">{row.className}</h4><p className="text-sm text-slate-600">{required} murid{finalized ? " · Snapshot muktamad" : ""}</p></div><p className={`text-sm font-medium ${status === "ready" ? "text-teal-800" : status === "final" ? "text-slate-700" : "text-amber-800"}`}>{status === "final" ? "Muktamad" : status === "ready" ? "Sedia dimuktamadkan" : status === "empty" ? "Belum diisi" : "Draf perlu disemak"}</p></div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">{subjectEntryFields.map((field, index) => {
                const percentage = subjectEntryPercentage(rowValues[field], required);
                return <label key={field} className="text-xs font-medium text-slate-600">{field === "notAssessed" ? "Belum ditaksir" : `TP${index + 1}`}<input id={`pbd-${field}-${row.classSubjectId}`} name={`${field}:${row.classSubjectId}`} value={rowValues[field]} onChange={(event) => updateField(row.classSubjectId, field, event.target.value)} onKeyDown={(event) => handleEnter(event, row.classSubjectId, field)} readOnly={finalized} aria-readonly={finalized} type="number" min="0" className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-2.5 py-2 text-base text-slate-900 read-only:cursor-not-allowed read-only:bg-stone-100 read-only:text-slate-600" /><span className="mt-1 block text-xs font-normal text-slate-500">{percentage === null ? "—" : `${percentage.toFixed(1)}%`}</span></label>;
              })}</div>
              <div className="mt-4 flex min-w-0 flex-col gap-3 border-t border-stone-100 pt-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm text-slate-600">Jumlah diisi: <span className="font-medium text-slate-950">{total}</span> · Diperlukan: <span className="font-medium text-slate-950">{required}</span></p><p className={`mt-1 text-sm font-medium ${balance.kind === "complete" ? "text-teal-800" : "text-amber-800"}`}>{balance.label}</p></div><div className="flex flex-col gap-2 sm:flex-row">{!finalized ? <button type="button" onClick={() => fillBlanks(row.classSubjectId)} className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-slate-800">Isi ruang kosong dengan 0</button> : null}<button type="submit" name="intent" value={finalized ? "reopen" : "finalize"} onClick={() => { if (targetRef.current) targetRef.current.value = row.classSubjectId; }} disabled={pending} className="rounded-md border border-teal-800 px-4 py-2 text-sm font-medium text-teal-900 disabled:opacity-60">{finalized ? "Simpan & buka semula" : "Simpan & muktamad"}</button></div></div>
            </article>;
          })}</section>;
        })}
      </section>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-300 bg-white lg:left-[208px] xl:left-[240px]"><div className="mx-auto min-w-0 max-w-7xl p-3 sm:flex sm:items-center sm:justify-between sm:px-6"><div className="min-w-0 text-sm text-slate-600">{state.error ? <span className="font-medium text-rose-700" role="alert">{state.error}</span> : state.success ? <span className="font-medium text-teal-800" role="status">{state.changedCount ?? 0} kelas berubah dan disimpan pada {state.savedAt}.</span> : dirty ? "Perubahan belum disimpan." : "Semua perubahan telah disimpan."}</div><button type="submit" name="intent" value="save" disabled={pending} className="mt-3 w-full rounded-md bg-teal-800 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 sm:mt-0 sm:w-auto">{pending ? "Menyimpan…" : "Simpan semua draf"}</button></div></div>
    </form>
  </div>;
}
