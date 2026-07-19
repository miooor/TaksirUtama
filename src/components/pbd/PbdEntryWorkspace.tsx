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
  subjectEntryMatchesFilter,
  subjectEntryPercentage,
  subjectEntryRecoveryKey,
  subjectEntryState,
  subjectEntryTotal,
  pbdSemesterSwitchMessage,
  pbdSubjectSaveFeedback,
  type SubjectEntryField,
  type SubjectEntryFilter,
  type SubjectEntryValues,
} from "@/lib/pbd/subjectEntryWorkflow";

const initialState: PbdActionState = {};
type SetupRow = DatabasePbdSetup["rows"][number];
type ValuesByRow = Record<string, SubjectEntryValues>;
type RecoveryDraft = { revisions: Record<string, number>; values: ValuesByRow };

const filterLabels: Array<{ id: SubjectEntryFilter; label: string }> = [
  { id: "unfinished", label: "Belum selesai" },
  { id: "all", label: "Semua" },
  { id: "final", label: "Muktamad" },
];

function SemesterSelector({ semester, onSelect }: { semester: "1" | "2"; onSelect: (semester: "1" | "2") => void }) {
  return <div className="min-w-0">
    <p className="text-sm font-semibold text-slate-900">Semester pengisian</p>
    <div className="mt-2 grid max-w-sm grid-cols-2 gap-2" aria-label="Pilih semester pengisian">
      {(["1", "2"] as const).map((value) => <button key={value} type="button" onClick={() => onSelect(value)} aria-current={semester === value ? "page" : undefined} className={`rounded-md px-4 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 ${semester === value ? "bg-stone-800 text-white" : "bg-stone-100 text-slate-700 hover:bg-stone-200"}`} style={semester === value ? { color: "#ffffff" } : undefined}>Semester {value}</button>)}
    </div>
  </div>;
}

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
  const [filter, setFilter] = useState<SubjectEntryFilter>("unfinished");
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

  function switchSemester(nextSemester: "1" | "2") {
    if (nextSemester === semester) return;
    if (dirty && !window.confirm(pbdSemesterSwitchMessage(semester, nextSemester))) return;
    router.push(`/pbd/entry?year=${year}&semester=${nextSemester}&subjectId=${selectedSubject?.id ?? ""}`);
  }

  function rowRequired(row: SetupRow) { return row.entry?.status === "final" ? row.entry.enrolledCount : row.enrolledCount; }
  function rowState(row: SetupRow) { return subjectEntryState(values[row.classSubjectId] ?? valuesFromRow(row), rowRequired(row), row.entry?.status === "final"); }
  const counts: Record<SubjectEntryFilter, number> = {
    all: rows.length,
    unfinished: rows.filter((row) => rowState(row) !== "final").length,
    empty: rows.filter((row) => rowState(row) === "empty").length,
    mismatch: rows.filter((row) => rowState(row) === "mismatch").length,
    ready: rows.filter((row) => rowState(row) === "ready").length,
    final: rows.filter((row) => rowState(row) === "final").length,
  };
  const visibleRows = rows.filter((row) => subjectEntryMatchesFilter(rowState(row), filter));
  const totalPupils = rows.reduce((sum, row) => sum + rowRequired(row), 0);
  const groups = Array.from(new Set(rows.map(levelLabel))).map((label) => ({ label, rows: rows.filter((row) => levelLabel(row) === label) }));

  function subjectProgress(subjectId: string) {
    const subjectRows = activeRows.filter((row) => row.subjectId === subjectId);
    const finalized = subjectRows.filter((row) => row.entry?.status === "final").length;
    return `${finalized}/${subjectRows.length} muktamad`;
  }

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

  if (!selectedSubject) {
    return <div className="mt-6 min-w-0 space-y-5"><section className="rounded-lg bg-white p-4 sm:p-5"><SemesterSelector semester={semester} onSelect={switchSemester} /></section><section className="rounded-lg border border-stone-200 bg-white p-6"><h2 className="text-lg font-semibold">Belum ada subjek yang ditetapkan</h2><p className="mt-2 text-sm text-slate-600">Tetapkan subjek kepada sekurang-kurangnya satu kelas dalam Setup Sekolah.</p><Link className="mt-4 inline-block rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white" href={`/school/setup?year=${year}&semester=${semester}&view=assignments`}>Buka Setup Sekolah</Link></section></div>;
  }

  return <div className="mt-6 min-w-0 space-y-5">
    <section className="rounded-lg bg-white p-4 sm:p-5">
      <div className="mb-5"><SemesterSelector semester={semester} onSelect={switchSemester} /></div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(15rem,1fr)_auto] lg:items-end">
        <label className="block min-w-0 text-sm font-medium text-slate-700">Subjek<select value={selectedSubject.id} onChange={(event) => switchSubject(event.target.value)} className="mt-1.5 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-base">{eligibleSubjects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name} · {subjectProgress(item.id)}</option>)}</select></label>
        <div className="min-w-0 lg:text-right"><p className="text-sm font-medium text-slate-900">{counts.final}/{rows.length} kelas muktamad</p><p className="mt-1 text-sm text-slate-600">{totalPupils} murid</p></div>
      </div>
      <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-3"><dl className="flex min-w-0 flex-wrap gap-x-5 gap-y-2 text-sm"><div><dt className="inline text-slate-600">Belum diisi </dt><dd className="inline font-semibold text-slate-950">{counts.empty}</dd></div><div><dt className="inline text-slate-600">Tidak sepadan </dt><dd className="inline font-semibold text-amber-800">{counts.mismatch}</dd></div><div><dt className="inline text-slate-600">Sedia </dt><dd className="inline font-semibold text-teal-800">{counts.ready}</dd></div></dl><Link href={`/school/setup?year=${year}&semester=${semester}&view=assignments`} className="text-sm font-medium text-teal-800 hover:text-teal-950">Urus penetapan</Link></div>
    </section>

    {recoveryDraft ? <section className="rounded-lg border border-amber-300 bg-amber-50 p-4"><h2 className="font-semibold text-amber-950">Perubahan belum disimpan ditemui</h2><p className="mt-1 text-sm text-amber-900">Pulihkan nilai yang disimpan sementara dalam tab ini?</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => { setValues(recoveryDraft.values); setDirty(true); setRecoveryDraft(null); }} className="rounded-md bg-amber-900 px-3 py-2 text-sm font-medium text-white">Pulihkan perubahan</button><button type="button" onClick={() => { if (recoveryKey) sessionStorage.removeItem(recoveryKey); setRecoveryDraft(null); }} className="rounded-md border border-amber-400 px-3 py-2 text-sm font-medium text-amber-950">Buang draf tempatan</button></div></section> : null}
    {recoveryNotice ? <p className="text-sm text-slate-600" role="status">{recoveryNotice}</p> : null}

    <div className="flex min-w-0 flex-wrap gap-1 rounded-lg bg-white p-2" aria-label="Tapis kelas">
      {filterLabels.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`rounded-md px-3 py-2 text-sm ${filter === item.id ? "bg-stone-800 font-semibold text-white" : "text-slate-600 hover:bg-stone-100"}`} style={filter === item.id ? { color: "#ffffff" } : undefined}>{item.label} ({counts[item.id]})</button>)}
    </div>

    <form action={action} className="min-w-0 pb-24">
      <input type="hidden" name="subjectId" value={selectedSubject.id} /><input type="hidden" name="year" value={year} /><input type="hidden" name="semester" value={semester} /><input ref={targetRef} type="hidden" name="targetClassSubjectId" value="" />
      <section className="rounded-lg bg-white"><div className="p-4 sm:p-5"><h2 className="text-lg font-semibold">Isi rumusan TP</h2><p className="mt-1 text-sm text-slate-600">Masukkan bilangan murid bagi setiap TP. Peratus dan baki dikira secara langsung.</p></div>
        {groups.map((group) => {
          const groupVisible = group.rows.some((row) => visibleRows.includes(row));
          return <section key={group.label} hidden={!groupVisible} className="border-t border-stone-200"><h3 className="bg-stone-100 px-4 py-3 font-semibold text-slate-900 sm:px-5">{group.label}</h3><div className="hidden grid-cols-[minmax(6.75rem,1.2fr)_repeat(6,minmax(2.8rem,0.55fr))_minmax(4rem,0.75fr)_minmax(4.5rem,0.7fr)_minmax(7.75rem,auto)] gap-2 px-5 py-2 text-xs font-medium text-slate-600 lg:grid"><span>Kelas</span>{["TP1", "TP2", "TP3", "TP4", "TP5", "TP6", "Belum ditaksir", "Jumlah", "Tindakan"].map((label) => <span key={label}>{label}</span>)}</div>{group.rows.map((row) => {
            const rowValues = values[row.classSubjectId] ?? valuesFromRow(row);
            const finalized = row.entry?.status === "final";
            const required = rowRequired(row);
            const total = subjectEntryTotal(rowValues);
            const balance = subjectEntryBalance(rowValues, required);
            const status = rowState(row);
            const visible = subjectEntryMatchesFilter(status, filter);
            return <article key={row.classSubjectId} hidden={!visible} className="min-w-0 border-t border-stone-200 p-4 sm:p-5 lg:grid lg:grid-cols-[minmax(6.75rem,1.2fr)_repeat(6,minmax(2.8rem,0.55fr))_minmax(4rem,0.75fr)_minmax(4.5rem,0.7fr)_minmax(7.75rem,auto)] lg:items-start lg:gap-2 lg:px-5 lg:py-3">
              <input type="hidden" name="classSubjectId" value={row.classSubjectId} /><input type="hidden" name={`revision:${row.classSubjectId}`} value={row.entry?.revision ?? 0} />
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 lg:block"><div className="min-w-0"><h4 className="font-semibold text-slate-950">{row.className}</h4><p className="text-sm text-slate-600">{required} murid{finalized ? " · Snapshot" : ""}</p></div><p className={`text-sm font-medium lg:hidden ${status === "ready" ? "text-teal-800" : status === "final" ? "text-slate-700" : "text-amber-800"}`}>{status === "final" ? "Muktamad" : status === "ready" ? "Sedia dimuktamadkan" : status === "empty" ? "Belum diisi" : "Draf perlu disemak"}</p></div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:contents">{subjectEntryFields.map((field, index) => {
                const percentage = subjectEntryPercentage(rowValues[field], required);
                const label = field === "notAssessed" ? "Belum ditaksir" : `TP${index + 1}`;
                return <label key={field} className="min-w-0 text-xs font-medium text-slate-600"><span className="lg:sr-only">{label}</span><input aria-label={`${label} untuk ${row.className}`} id={`pbd-${field}-${row.classSubjectId}`} name={`${field}:${row.classSubjectId}`} value={rowValues[field]} onChange={(event) => updateField(row.classSubjectId, field, event.target.value)} onKeyDown={(event) => handleEnter(event, row.classSubjectId, field)} readOnly={finalized} aria-readonly={finalized} type="number" min="0" className="mt-1 block w-full min-w-0 rounded-md border border-stone-300 bg-white px-2 py-2 text-base text-slate-900 read-only:cursor-not-allowed read-only:bg-stone-100 read-only:text-slate-600 lg:mt-0" /><span className="mt-1 block text-xs font-normal text-slate-500">{percentage === null ? "—" : `${percentage.toFixed(1)}%`}</span></label>;
              })}</div>
              <div className="mt-4 flex min-w-0 flex-col gap-3 border-t border-stone-100 pt-3 sm:flex-row sm:items-center sm:justify-between lg:contents"><div className="min-w-0"><p className="text-sm text-slate-600"><span className="font-medium text-slate-950">{total}/{required}</span></p><p className={`mt-1 text-sm font-medium ${balance.kind === "complete" ? "text-teal-800" : "text-amber-800"}`}>{balance.label}</p></div><div className="flex flex-col gap-2 sm:flex-row lg:flex-col">{!finalized ? <button type="button" onClick={() => fillBlanks(row.classSubjectId)} className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-slate-800">Isi kosong dengan 0</button> : null}<button type="submit" name="intent" value={finalized ? "reopen" : "finalize"} onClick={() => { if (targetRef.current) targetRef.current.value = row.classSubjectId; }} disabled={pending} className="rounded-md border border-teal-800 px-3 py-2 text-sm font-medium text-teal-900 disabled:opacity-60">{finalized ? "Buka semula" : `Simpan & Hantar · Semester ${semester}`}</button></div></div>
            </article>;
          })}</section>;
        })}
      </section>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-300 bg-white lg:left-[208px] xl:left-[240px]"><div className="mx-auto min-w-0 max-w-7xl p-3 sm:flex sm:items-center sm:justify-between sm:px-6"><div className="min-w-0 text-sm text-slate-600">{state.error ? <span className="font-medium text-rose-700" role="alert">{state.error}</span> : state.success ? <span className="font-medium text-teal-800" role="status">{pbdSubjectSaveFeedback(state.changedCount ?? 0, state.semester ?? semester, state.savedAt)}</span> : dirty ? "Perubahan belum disimpan." : "Semua perubahan telah disimpan."}</div><button type="submit" name="intent" value="save" disabled={pending} className="mt-3 w-full rounded-md bg-teal-800 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 sm:mt-0 sm:w-auto">{pending ? "Menyimpan…" : "Simpan semua draf"}</button></div></div>
    </form>
  </div>;
}
