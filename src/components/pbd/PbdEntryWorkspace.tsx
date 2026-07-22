"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import type { DatabasePbdSetup } from "@/lib/db/pbd";
import {
  savePbdClassEntriesAction,
  savePbdSubjectEntriesAction,
  type PbdActionState,
} from "@/app/pbd/entry/actions";
import {
  emptyPbdEntryValues,
  entryPasteErrorMessages,
  fillPbdEntryBlanks,
  parseEntryPaste,
  pbdEntryBalance,
  pbdEntryFields,
  pbdEntryHref,
  pbdEntryMatchesFilter,
  pbdEntryPercentage,
  pbdEntryRecoveryKey,
  pbdEntrySaveFeedback,
  pbdEntryState,
  pbdEntryStatusLabel,
  pbdEntryTotal,
  pbdModeSwitchMessage,
  pbdSemesterSwitchMessage,
  revisionsMatch,
  sortClassesForEntry,
  type PbdEntryField,
  type PbdEntryFilter,
  type PbdEntryMode,
  type PbdEntryValues,
} from "@/lib/pbd/entryWorkflow";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";

const initialState: PbdActionState = {};
type SetupRow = DatabasePbdSetup["rows"][number];
type ValuesByRow = Record<string, PbdEntryValues>;
type RecoveryDraft = { revisions: Record<string, number>; values: ValuesByRow };

const filterLabels: Array<{ id: PbdEntryFilter; label: string }> = [
  { id: "unfinished", label: "Belum selesai" },
  { id: "all", label: "Semua" },
  { id: "final", label: "Muktamad" },
];

function valuesFromRow(row: SetupRow): PbdEntryValues {
  const entry = row.entry;
  if (!entry) return emptyPbdEntryValues();
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

function sortSubjectModeRows(rows: SetupRow[]) {
  const order = { tahun: 0, peralihan: 1, tingkatan: 2 };
  return [...rows].sort((a, b) => order[a.classLevelKind] - order[b.classLevelKind]
    || (a.classLevelNumber ?? 0) - (b.classLevelNumber ?? 0)
    || a.className.localeCompare(b.className, "ms"));
}

function sortClassModeRows(rows: SetupRow[]) {
  return [...rows].sort((a, b) => a.subjectCode.localeCompare(b.subjectCode, "ms")
    || a.subjectName.localeCompare(b.subjectName, "ms"));
}

const statusBorder: Record<string, string> = {
  empty: "border-l-border-strong",
  mismatch: "border-l-warning",
  ready: "border-l-primary-500",
  final: "border-l-success",
};

export function PbdEntryWorkspace({
  setup,
  year,
  semester,
  mode,
  selectedSubjectId,
  selectedClassId,
  canManageSetup,
}: {
  setup: DatabasePbdSetup;
  year: string;
  semester: "1" | "2";
  mode: PbdEntryMode;
  selectedSubjectId: string | null;
  selectedClassId: string | null;
  canManageSetup: boolean;
}) {
  const router = useRouter();
  const targetRef = useRef<HTMLInputElement>(null);
  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState<PbdEntryFilter>("unfinished");
  const [recoveryDraft, setRecoveryDraft] = useState<RecoveryDraft | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const [pasteError, setPasteError] = useState("");
  const activeClassIds = useMemo(() => new Set(setup.classes.filter((item) => item.active).map((item) => item.id)), [setup.classes]);
  const activeSubjectIds = useMemo(() => new Set(setup.subjects.filter((item) => item.active).map((item) => item.id)), [setup.subjects]);
  const activeRows = useMemo(() => setup.rows.filter((row) => row.active && activeClassIds.has(row.classId) && activeSubjectIds.has(row.subjectId)), [setup.rows, activeClassIds, activeSubjectIds]);

  const eligibleSubjectIds = useMemo(() => new Set(activeRows.map((row) => row.subjectId)), [activeRows]);
  const eligibleSubjects = useMemo(() => setup.subjects.filter((item) => item.active && eligibleSubjectIds.has(item.id)), [setup.subjects, eligibleSubjectIds]);
  const selectedSubject = eligibleSubjects.find((item) => item.id === selectedSubjectId) ?? eligibleSubjects[0] ?? null;

  const eligibleClassIds = useMemo(() => new Set(activeRows.map((row) => row.classId)), [activeRows]);
  const eligibleClasses = useMemo(() => sortClassesForEntry(setup.classes.filter((item) => item.active && eligibleClassIds.has(item.id))), [setup.classes, eligibleClassIds]);
  const selectedClass = eligibleClasses.find((item) => item.id === selectedClassId) ?? eligibleClasses[0] ?? null;

  const selection = mode === "class" ? selectedClass : selectedSubject;
  const rows = useMemo(() => {
    if (mode === "class") return selectedClass ? sortClassModeRows(activeRows.filter((row) => row.classId === selectedClass.id)) : [];
    return selectedSubject ? sortSubjectModeRows(activeRows.filter((row) => row.subjectId === selectedSubject.id)) : [];
  }, [mode, activeRows, selectedClass, selectedSubject]);
  const initialValues = useMemo(() => Object.fromEntries(rows.map((row) => [row.classSubjectId, valuesFromRow(row)])) as ValuesByRow, [rows]);
  const [values, setValues] = useState<ValuesByRow>(initialValues);
  const revisions = useMemo(() => Object.fromEntries(rows.map((row) => [row.classSubjectId, row.entry?.revision ?? 0])), [rows]);
  const recoveryKey = selection ? pbdEntryRecoveryKey(setup.schoolId, year, semester, mode, selection.id) : null;
  const saveAction = mode === "class" ? savePbdClassEntriesAction : savePbdSubjectEntriesAction;
  const [state, action, pending] = useActionState(async (previousState: PbdActionState, formData: FormData) => {
    const nextState = await saveAction(previousState, formData);
    if (nextState.success) {
      if (recoveryKey) sessionStorage.removeItem(recoveryKey);
      setDirty(false);
      setRecoveryDraft(null);
      setPasteError("");
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
      const validValues = rows.every((row) => pbdEntryFields.every((field) => typeof recovered.values?.[row.classSubjectId]?.[field] === "string"));
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

  function updateField(rowId: string, field: PbdEntryField, value: string) {
    setValues((current) => {
      const next = { ...current, [rowId]: { ...current[rowId], [field]: value } };
      persist(next);
      return next;
    });
    setPasteError("");
    setDirty(true);
  }

  function guardSwitch(proceed: () => void) {
    if (dirty && !window.confirm("Terdapat perubahan yang belum disimpan. Tukar paparan tanpa menyimpan?")) return;
    proceed();
  }

  function switchMode(nextMode: PbdEntryMode) {
    if (nextMode === mode) return;
    if (dirty && !window.confirm(pbdModeSwitchMessage(nextMode))) return;
    router.push(pbdEntryHref({ year, semester, mode: nextMode }));
  }

  function switchSubject(subjectId: string) {
    if (subjectId === selectedSubject?.id) return;
    guardSwitch(() => router.push(pbdEntryHref({ year, semester, mode: "subject", selectionId: subjectId })));
  }

  function switchClass(classId: string) {
    if (classId === selectedClass?.id) return;
    guardSwitch(() => router.push(pbdEntryHref({ year, semester, mode: "class", selectionId: classId })));
  }

  function switchSemester(nextSemester: "1" | "2") {
    if (nextSemester === semester) return;
    if (dirty && !window.confirm(pbdSemesterSwitchMessage(semester, nextSemester))) return;
    router.push(pbdEntryHref({ year, semester: nextSemester, mode, selectionId: selection?.id ?? null }));
  }

  function rowRequired(row: SetupRow) { return row.entry?.status === "final" ? row.entry.enrolledCount : row.enrolledCount; }
  function rowState(row: SetupRow) { return pbdEntryState(values[row.classSubjectId] ?? valuesFromRow(row), rowRequired(row), row.entry?.status === "final"); }
  const counts: Record<PbdEntryFilter, number> = {
    all: rows.length,
    unfinished: rows.filter((row) => rowState(row) !== "final").length,
    empty: rows.filter((row) => rowState(row) === "empty").length,
    mismatch: rows.filter((row) => rowState(row) === "mismatch").length,
    ready: rows.filter((row) => rowState(row) === "ready").length,
    final: rows.filter((row) => rowState(row) === "final").length,
  };
  const visibleRows = rows.filter((row) => pbdEntryMatchesFilter(rowState(row), filter));
  const totalPupils = rows.reduce((sum, row) => sum + rowRequired(row), 0);
  const groups: Array<{ label: string | null; rows: SetupRow[] }> = mode === "class"
    ? (rows.length ? [{ label: null, rows }] : [])
    : Array.from(new Set(rows.map(levelLabel))).map((label) => ({ label, rows: rows.filter((row) => levelLabel(row) === label) }));

  function assignmentProgress(kind: PbdEntryMode, id: string) {
    const scopeRows = kind === "subject" ? activeRows.filter((row) => row.subjectId === id) : activeRows.filter((row) => row.classId === id);
    const finalized = scopeRows.filter((row) => row.entry?.status === "final").length;
    return `${finalized}/${scopeRows.length} muktamad`;
  }

  function rowTitle(row: SetupRow) {
    return mode === "class" ? `${row.subjectCode} · ${row.subjectName}` : row.className;
  }

  function handleEnter(event: React.KeyboardEvent<HTMLInputElement>, rowId: string, field: PbdEntryField) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const editableVisibleRows = visibleRows.filter((row) => row.entry?.status !== "final");
    const currentIndex = editableVisibleRows.findIndex((row) => row.classSubjectId === rowId);
    const target = editableVisibleRows[currentIndex + (event.shiftKey ? -1 : 1)];
    if (target) document.getElementById(`pbd-${field}-${target.classSubjectId}`)?.focus();
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>, rowId: string, field: PbdEntryField) {
    const text = event.clipboardData.getData("text");
    if (!text || (!text.includes("\t") && !text.includes("\n") && !text.includes("\r"))) return;
    event.preventDefault();
    const parsed = parseEntryPaste(text);
    if (!parsed.ok) {
      setPasteError(entryPasteErrorMessages[parsed.reason]);
      return;
    }
    const editableVisibleRows = visibleRows.filter((row) => row.entry?.status !== "final");
    const originRow = editableVisibleRows.findIndex((row) => row.classSubjectId === rowId);
    const originField = pbdEntryFields.indexOf(field);
    if (originRow === -1) return;
    if (parsed.grid.length > editableVisibleRows.length - originRow) {
      setPasteError(entryPasteErrorMessages.rows);
      return;
    }
    if (parsed.grid.some((cells) => cells.length > pbdEntryFields.length - originField)) {
      setPasteError(entryPasteErrorMessages.columns);
      return;
    }
    setValues((current) => {
      const next = { ...current };
      parsed.grid.forEach((cells, rowIndex) => {
        const targetRow = editableVisibleRows[originRow + rowIndex];
        cells.forEach((cell, cellIndex) => {
          if (cell === "") return;
          const targetField = pbdEntryFields[originField + cellIndex];
          next[targetRow.classSubjectId] = { ...next[targetRow.classSubjectId], [targetField]: cell };
        });
      });
      persist(next);
      return next;
    });
    setPasteError("");
    setDirty(true);
  }

  function fillBlanks(rowId: string) {
    setValues((current) => {
      const next = { ...current, [rowId]: fillPbdEntryBlanks(current[rowId]) };
      persist(next);
      return next;
    });
    setDirty(true);
  }

  if (!selection) {
    return (
      <div className="mt-6 min-w-0 space-y-5">
        <section className="rounded-xl border border-border-default bg-surface-card p-4 shadow-card sm:p-5">
          <div className="mb-5"><ModeTabs mode={mode} onSelect={switchMode} /></div>
          <SemesterTabs semester={semester} onSelect={switchSemester} />
        </section>
        <EmptyState
          icon={Settings2}
          title={mode === "class" ? "Belum ada kelas yang ditetapkan" : "Belum ada subjek yang ditetapkan"}
          description={mode === "class" ? "Tambah kelas aktif dalam Setup Sekolah." : "Tetapkan subjek kepada sekurang-kurangnya satu kelas dalam Setup Sekolah."}
          action={canManageSetup ? <Button href={`/school/setup?year=${year}&semester=${semester}&view=assignments`}>Buka Setup Sekolah</Button> : <p className="text-sm font-medium text-text-secondary">Hubungi pentadbir sekolah untuk melengkapkan setup.</p>}
        />
      </div>
    );
  }

  const selectionUnit = mode === "class" ? "subjek" : "kelas";

  return <div className="mt-6 min-w-0 space-y-5">
    <section className="rounded-xl border border-border-default bg-surface-card p-4 shadow-card sm:p-5">
      <div className="mb-5"><ModeTabs mode={mode} onSelect={switchMode} /></div>
      <div className="mb-5"><SemesterTabs semester={semester} onSelect={switchSemester} /></div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(15rem,1fr)_auto] lg:items-end">
        <label className="block min-w-0 text-sm font-medium text-text-secondary">{mode === "class" ? "Kelas" : "Subjek"}
          <div className="mt-1.5">
            {mode === "class" ? (
              <Select value={selectedClass!.id} onChange={(event) => switchClass(event.target.value)}>
                {eligibleClasses.map((item) => <option key={item.id} value={item.id}>{item.name} · {assignmentProgress("class", item.id)}</option>)}
              </Select>
            ) : (
              <Select value={selectedSubject!.id} onChange={(event) => switchSubject(event.target.value)}>
                {eligibleSubjects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name} · {assignmentProgress("subject", item.id)}</option>)}
              </Select>
            )}
          </div>
        </label>
        <div className="min-w-0 lg:text-right">
          <p className="text-sm font-semibold tabular-nums text-text-primary">{counts.final}/{rows.length} {selectionUnit} muktamad</p>
          <p className="mt-1 text-sm tabular-nums text-text-muted">{totalPupils} murid</p>
        </div>
      </div>
      <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <dl className="flex min-w-0 flex-wrap gap-x-5 gap-y-2 text-sm">
          <div><dt className="inline text-text-muted">Belum diisi </dt><dd className="inline font-semibold tabular-nums text-text-primary">{counts.empty}</dd></div>
          <div><dt className="inline text-text-muted">Perlu semakan </dt><dd className="inline font-semibold tabular-nums text-warning-text">{counts.mismatch}</dd></div>
          <div><dt className="inline text-text-muted">Sedia dimuktamadkan </dt><dd className="inline font-semibold tabular-nums text-primary-700">{counts.ready}</dd></div>
        </dl>
        {canManageSetup ? <Link href={`/school/setup?year=${year}&semester=${semester}&view=assignments`} className="text-sm font-semibold text-primary-700 transition-colors hover:text-primary-800">Urus penetapan</Link> : null}
      </div>
    </section>

    {recoveryDraft ? (
      <Alert variant="warning" title="Perubahan belum disimpan ditemui">
        Pulihkan nilai yang disimpan sementara dalam tab ini?
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={() => { setValues(recoveryDraft.values); setDirty(true); setRecoveryDraft(null); }}>Pulihkan perubahan</Button>
          <Button size="sm" variant="outline" onClick={() => { if (recoveryKey) sessionStorage.removeItem(recoveryKey); setRecoveryDraft(null); }}>Buang draf tempatan</Button>
        </div>
      </Alert>
    ) : null}
    {recoveryNotice ? <p className="text-sm text-text-muted" role="status">{recoveryNotice}</p> : null}

    <div className="flex min-w-0 flex-wrap gap-1 rounded-xl border border-border-default bg-surface-inset p-1.5" aria-label={mode === "class" ? "Tapis subjek" : "Tapis kelas"}>
      {filterLabels.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setFilter(item.id)}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-[background,color,box-shadow] ${filter === item.id ? "bg-surface-card text-primary-700 shadow-raised" : "text-text-muted hover:text-text-primary"}`}
        >
          {item.label} <span className="tabular-nums opacity-70">({counts[item.id]})</span>
        </button>
      ))}
    </div>

    <form action={action} className="min-w-0 pb-24">
      {mode === "class"
        ? <input type="hidden" name="classId" value={selectedClass!.id} />
        : <input type="hidden" name="subjectId" value={selectedSubject!.id} />}
      <input type="hidden" name="year" value={year} /><input type="hidden" name="semester" value={semester} /><input ref={targetRef} type="hidden" name="targetClassSubjectId" value="" />
      <section className="overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-card">
        <div className="p-4 sm:p-5">
          <h2 className="font-display text-lg font-semibold text-text-primary">Isi rumusan TP</h2>
          <p className="mt-1 text-sm text-text-muted">Masukkan bilangan murid bagi setiap TP. Peratus dan baki dikira secara langsung. Tampal daripada Excel atau Google Sheets disokong.</p>
        </div>
        {groups.map((group) => {
          const groupVisible = group.rows.some((row) => visibleRows.includes(row));
          return <section key={group.label ?? "all"} hidden={!groupVisible} className="border-t border-border-default">
            {group.label ? <h3 className="bg-surface-inset px-4 py-3 font-display text-sm font-semibold uppercase tracking-wide text-text-secondary sm:px-5">{group.label}</h3> : null}
            <div className="hidden grid-cols-[minmax(6.75rem,1.2fr)_repeat(6,minmax(2.8rem,0.55fr))_minmax(4rem,0.75fr)_minmax(4.5rem,0.7fr)_minmax(7.75rem,auto)] gap-2 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted lg:grid">
              <span>{mode === "class" ? "Subjek" : "Kelas"}</span>{["TP1", "TP2", "TP3", "TP4", "TP5", "TP6", "Belum ditaksir", "Jumlah", "Tindakan"].map((label) => <span key={label}>{label}</span>)}
            </div>
            {group.rows.map((row) => {
              const rowValues = values[row.classSubjectId] ?? valuesFromRow(row);
              const finalized = row.entry?.status === "final";
              const required = rowRequired(row);
              const total = pbdEntryTotal(rowValues);
              const balance = pbdEntryBalance(rowValues, required);
              const status = rowState(row);
              const visible = pbdEntryMatchesFilter(status, filter);
              return <article key={row.classSubjectId} hidden={!visible} className={`min-w-0 border-t border-l-4 border-border-default p-4 ${statusBorder[status]} sm:p-5 lg:grid lg:grid-cols-[minmax(6.75rem,1.2fr)_repeat(6,minmax(2.8rem,0.55fr))_minmax(4rem,0.75fr)_minmax(4.5rem,0.7fr)_minmax(7.75rem,auto)] lg:items-start lg:gap-2 lg:px-5 lg:py-3`}>
                <input type="hidden" name="classSubjectId" value={row.classSubjectId} /><input type="hidden" name={`revision:${row.classSubjectId}`} value={row.entry?.revision ?? 0} />
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 lg:block">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-text-primary">{rowTitle(row)}</h4>
                    <p className="text-sm tabular-nums text-text-muted">{required} murid{finalized ? " · Snapshot" : ""}</p>
                  </div>
                  <p className={`text-sm font-semibold lg:hidden ${status === "ready" ? "text-primary-700" : status === "final" ? "text-success-text" : status === "empty" ? "text-text-muted" : "text-warning-text"}`}>
                    {pbdEntryStatusLabel(status)}
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:contents">
                  {pbdEntryFields.map((field, index) => {
                    const percentage = pbdEntryPercentage(rowValues[field], required);
                    const label = field === "notAssessed" ? "Belum ditaksir" : `TP${index + 1}`;
                    return <label key={field} className="min-w-0 text-xs font-medium text-text-muted">
                      <span className="lg:sr-only">{label}</span>
                      <input
                        aria-label={`${label} untuk ${rowTitle(row)}`}
                        id={`pbd-${field}-${row.classSubjectId}`}
                        name={`${field}:${row.classSubjectId}`}
                        value={rowValues[field]}
                        onChange={(event) => updateField(row.classSubjectId, field, event.target.value)}
                        onKeyDown={(event) => handleEnter(event, row.classSubjectId, field)}
                        onPaste={(event) => handlePaste(event, row.classSubjectId, field)}
                        readOnly={finalized}
                        aria-readonly={finalized}
                        type="number"
                        min="0"
                        className="mt-1 block h-11 w-full min-w-0 rounded-lg border border-border-strong bg-surface-card px-2 text-center text-base font-semibold tabular-nums text-text-primary shadow-raised transition-[border-color,box-shadow] focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-500/20 read-only:cursor-not-allowed read-only:bg-surface-inset read-only:text-text-muted lg:mt-0"
                      />
                      <span className="mt-1 block text-center text-xs font-normal tabular-nums text-text-disabled">{percentage === null ? "—" : `${percentage.toFixed(1)}%`}</span>
                    </label>;
                  })}
                </div>
                <div className="mt-4 flex min-w-0 flex-col gap-3 border-t border-border-default pt-3 sm:flex-row sm:items-center sm:justify-between lg:contents">
                  <div className="min-w-0">
                    <p className="text-sm tabular-nums text-text-muted"><span className="font-semibold text-text-primary">{total}/{required}</span></p>
                    <p className={`mt-1 text-sm font-semibold ${balance.kind === "complete" ? "text-primary-700" : "text-warning-text"}`}>{balance.label}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    {!finalized ? <Button size="sm" variant="outline" onClick={() => fillBlanks(row.classSubjectId)}>Isi kosong dengan 0</Button> : null}
                    <Button size="sm" variant={finalized ? "outline" : "primary"} type="submit" name="intent" value={finalized ? "reopen" : "finalize"} disabled={pending} onClick={() => { if (targetRef.current) targetRef.current.value = row.classSubjectId; }}>
                      {finalized ? "Buka semula" : `Simpan & Hantar · S${semester}`}
                    </Button>
                  </div>
                </div>
              </article>;
            })}
          </section>;
        })}
      </section>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border-default bg-surface-card shadow-sticky lg:left-[208px] xl:left-[240px]">
        <div className="mx-auto min-w-0 max-w-7xl p-3 sm:flex sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0 text-sm text-text-muted">
            {state.error ? <span className="font-semibold text-danger-text" role="alert">{state.error}</span>
              : pasteError ? <span className="font-semibold text-danger-text" role="alert">{pasteError}</span>
              : state.success ? <span className="font-semibold text-success-text" role="status">{pbdEntrySaveFeedback(mode, state.changedCount ?? 0, state.semester ?? semester, state.savedAt)}</span>
              : dirty ? "Perubahan belum disimpan." : "Semua perubahan telah disimpan."}
          </div>
          <Button type="submit" name="intent" value="save" disabled={pending} loading={pending} className="mt-3 w-full sm:mt-0 sm:w-auto">
            {pending ? "Menyimpan…" : "Simpan semua draf"}
          </Button>
        </div>
      </div>
    </form>
  </div>;
}

function ModeTabs({ mode, onSelect }: { mode: PbdEntryMode; onSelect: (mode: PbdEntryMode) => void }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-text-primary">Mod pengisian</p>
      <div className="mt-2">
        <Tabs
          label="Pilih mod pengisian"
          items={([
            { key: "subject", label: "Mengikut subjek", value: "subject" as const },
            { key: "class", label: "Mengikut kelas", value: "class" as const },
          ]).map((item) => ({
            key: item.key,
            label: item.label,
            active: mode === item.value,
            onClick: () => onSelect(item.value),
          }))}
        />
      </div>
    </div>
  );
}

function SemesterTabs({ semester, onSelect }: { semester: "1" | "2"; onSelect: (semester: "1" | "2") => void }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-text-primary">Semester pengisian</p>
      <div className="mt-2">
        <Tabs
          label="Pilih semester pengisian"
          items={(["1", "2"] as const).map((value) => ({
            key: value,
            label: `Semester ${value}`,
            active: semester === value,
            onClick: () => onSelect(value),
          }))}
        />
      </div>
    </div>
  );
}
