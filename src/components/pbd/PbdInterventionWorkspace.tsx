"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ChevronRight, Plus } from "lucide-react";
import { archiveInterventionAction, saveInterventionAction, type InterventionActionState } from "@/app/pbd/interventions/entry/actions";
import type { DatabasePbdSetup } from "@/lib/db/pbd";
import { calculateInterventionCoverage } from "@/lib/pbd/interventionWorkflow";
import { pbdSemesterSwitchMessage } from "@/lib/pbd/entryWorkflow";
import { applyQueueFilters, compareQueueOrder, deriveOverdue, effectiveStatus, parseQueueFilters } from "@/lib/pbd/interventionLifecycle";
import type { InterventionWorkflowStatus, PbdInterventionEntry } from "@/types/intervention";
import type { SchoolRegistry, StudentClassEnrollment } from "@/types/registry";

const initialState: InterventionActionState = {};

const STATUS_LABELS: Record<InterventionWorkflowStatus, string> = {
  planned: "Dirancang",
  in_progress: "Berjalan",
  needs_review: "Perlu semakan",
  completed: "Selesai",
};

const STATUS_TONES: Record<InterventionWorkflowStatus, string> = {
  planned: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-50 text-blue-800",
  needs_review: "bg-amber-50 text-amber-800",
  completed: "bg-teal-50 text-teal-800",
};

function Message({ state }: { state: InterventionActionState }) {
  if (state.error) return <p className="mt-2 text-sm text-red-700" role="alert">{state.error}</p>;
  if (state.success) return <p className="mt-2 text-sm text-teal-800" role="status">{state.success}</p>;
  return null;
}

function StatusBadge({ entry }: { entry: PbdInterventionEntry }) {
  const status = effectiveStatus(entry);
  const overdue = deriveOverdue(entry);
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONES[status]}`}>
        {STATUS_LABELS[status]}
      </span>
      {overdue ? <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Lewat</span> : null}
    </span>
  );
}

function InterventionEditor({
  year, semester, entry, editorId, onDirty, onClose,
}: {
  year: string;
  semester: "1" | "2";
  entry: PbdInterventionEntry;
  editorId: string;
  onDirty: (id: string, dirty: boolean) => void;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(saveInterventionAction, initialState);
  const [archiveState, archiveAction, archivePending] = useActionState(archiveInterventionAction, initialState);
  const status = effectiveStatus(entry);

  useEffect(() => { if (state.success) onDirty(editorId, false); }, [editorId, onDirty, state.success]);

  return (
    <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-card">
      <form action={action} onChange={() => onDirty(editorId, true)}>
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="semester" value={semester} />
        <input type="hidden" name="classSubjectId" value={entry.classSubjectId} />
        <input type="hidden" name="classEnrollmentId" value={entry.classEnrollmentId} />
        <input type="hidden" name="expectedRevision" value={entry.revision ?? 0} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-text-primary">{entry.studentName}</p>
            <p className="text-sm text-text-muted">{entry.className} · {entry.subjectCode} · TP{entry.tp}</p>
          </div>
          <StatusBadge entry={entry} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-text-secondary">
            Tahap Penguasaan
            <select name="tpLevel" defaultValue={entry.tp} className="mt-1 w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm">
              <option value="1">TP1</option>
              <option value="2">TP2</option>
            </select>
          </label>
          <label className="block text-sm text-text-secondary">
            Status
            <select name="workflowStatus" defaultValue={status} className="mt-1 w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm">
              <option value="planned">Dirancang</option>
              <option value="in_progress">Berjalan</option>
              <option value="needs_review">Perlu semakan</option>
              <option value="completed">Selesai</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block min-w-0 text-sm text-text-secondary">
            Masalah
            <textarea name="problem" required maxLength={2000} rows={3} defaultValue={entry.problem} className="mt-1 w-full resize-y rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm" />
          </label>
          <label className="block min-w-0 text-sm text-text-secondary">
            Intervensi
            <textarea name="intervention" required maxLength={2000} rows={3} defaultValue={entry.intervention} className="mt-1 w-full resize-y rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="block text-sm text-text-secondary">
            Tarikh semakan
            <input type="date" name="reviewDueOn" defaultValue={entry.reviewDueOn ?? ""} className="mt-1 w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm text-text-secondary">
            Tarikh disemak
            <input type="date" name="reviewedOn" defaultValue={entry.reviewedOn ?? ""} className="mt-1 w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm" />
          </label>
          <label className="block min-w-0 text-sm text-text-secondary">
            Nota susulan terkini
            <textarea name="followUpNote" maxLength={2000} rows={2} defaultValue={entry.followUpNote ?? ""} className="mt-1 w-full resize-y rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button disabled={pending} className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-800 disabled:opacity-60">
            {pending ? "Menyimpan…" : "Simpan"}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-inset">
            Tutup
          </button>
        </div>
        <Message state={state} />
      </form>

      <form action={archiveAction} className="mt-3 border-t border-border-default pt-3">
        <input type="hidden" name="interventionId" value={entry.id} />
        <input type="hidden" name="expectedRevision" value={entry.revision} />
        <input type="hidden" name="restore" value={entry.active === false ? "true" : "false"} />
        <button disabled={archivePending} className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary disabled:opacity-60">
          {entry.active === false ? <><ArchiveRestore className="h-3.5 w-3.5" /> Pulihkan</> : <><Archive className="h-3.5 w-3.5" /> Arkibkan</>}
        </button>
        <Message state={archiveState} />
      </form>
    </div>
  );
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
  return (
    <form action={action} onChange={() => onDirty(editorId, true)} className="rounded-lg border border-border-default bg-surface-card p-4 shadow-card">
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="semester" value={semester} />
      <input type="hidden" name="classSubjectId" value={classSubjectId} />
      <input type="hidden" name="expectedRevision" value="0" />
      <input type="hidden" name="workflowStatus" value="planned" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm text-text-secondary">
          Murid
          <select required name="classEnrollmentId" className="mt-1 w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm">
            <option value="">Pilih murid</option>
            {enrollments.map((item) => <option key={item.id} value={item.id}>{item.rosterNumber ? `${item.rosterNumber}. ` : ""}{item.student.displayName}</option>)}
          </select>
        </label>
        <label className="block text-sm text-text-secondary">
          TP
          <select name="tpLevel" defaultValue="2" className="mt-1 w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm">
            <option value="1">TP1</option>
            <option value="2">TP2</option>
          </select>
        </label>
        <label className="block text-sm text-text-secondary">
          Tarikh semakan
          <input type="date" name="reviewDueOn" className="mt-1 w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm" />
        </label>
        <label className="block min-w-0 text-sm text-text-secondary">
          Masalah
          <textarea name="problem" required maxLength={2000} rows={2} className="mt-1 w-full resize-y rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm" />
        </label>
        <label className="block min-w-0 text-sm text-text-secondary">
          Intervensi
          <textarea name="intervention" required maxLength={2000} rows={2} className="mt-1 w-full resize-y rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm" />
        </label>
      </div>
      <div className="mt-4">
        <button disabled={pending} className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-800 disabled:opacity-60">
          {pending ? "Menyimpan…" : "Tambah intervensi"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}

export function PbdInterventionWorkspace({
  setup, registry, entries, year, semester, filterParams,
}: {
  setup: DatabasePbdSetup;
  registry: SchoolRegistry;
  entries: PbdInterventionEntry[];
  year: string;
  semester: "1" | "2";
  filterParams: { status?: string; subjectId?: string; classId?: string; tp?: string; reviewBefore?: string };
}) {
  const router = useRouter();
  const [dirtyEditors, setDirtyEditors] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const hasDirty = dirtyEditors.size > 0;

  const filters = useMemo(() => parseQueueFilters(filterParams), [filterParams]);

  const activeRows = setup.rows.filter((row) => row.active && setup.classes.some((item) => item.id === row.classId && item.active) && setup.subjects.some((item) => item.id === row.subjectId && item.active));
  const eligibleSubjectIds = new Set(activeRows.map((row) => row.subjectId));
  const subjects = setup.subjects.filter((item) => item.active && eligibleSubjectIds.has(item.id));
  const classes = setup.classes.filter((item) => item.active);

  const filteredEntries = useMemo(() => {
    const filtered = applyQueueFilters(entries, filters);
    return filtered.sort((a, b) => compareQueueOrder(a, b));
  }, [entries, filters]);

  const metrics = useMemo(() => {
    const active = entries.filter((item) => item.active !== false);
    return {
      total: active.length,
      overdue: active.filter((item) => deriveOverdue(item)).length,
      needsReview: active.filter((item) => effectiveStatus(item) === "needs_review").length,
      inProgress: active.filter((item) => effectiveStatus(item) === "in_progress").length,
      completed: active.filter((item) => effectiveStatus(item) === "completed").length,
    };
  }, [entries]);

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

  function buildFilterHref(overrides: Record<string, string | undefined>, semesterOverride?: string) {
    const params = new URLSearchParams();
    params.set("year", year);
    params.set("semester", semesterOverride ?? semester);
    const merged = { ...filterParams, ...overrides };
    if (merged.status) params.set("status", merged.status);
    if (merged.subjectId) params.set("subjectId", merged.subjectId);
    if (merged.classId) params.set("classId", merged.classId);
    if (merged.tp) params.set("tp", merged.tp);
    if (merged.reviewBefore) params.set("reviewBefore", merged.reviewBefore);
    return `/pbd/interventions/entry?${params.toString()}`;
  }

  // Determine available enrollments for new intervention form
  const selectedClassSubjectId = filters.subjectId
    ? activeRows.find((row) => row.subjectId === filters.subjectId)?.classSubjectId
    : activeRows[0]?.classSubjectId;
  const newFormClassSubjectId = selectedClassSubjectId ?? activeRows[0]?.classSubjectId ?? null;
  const newFormEnrollments = newFormClassSubjectId
    ? (() => {
        const row = activeRows.find((r) => r.classSubjectId === newFormClassSubjectId);
        if (!row) return [];
        const classEnrollments = registry.enrollments.filter((item) => item.active && item.classId === row.classId);
        const usedIds = new Set(entries.filter((item) => item.classSubjectId === newFormClassSubjectId).map((item) => item.classEnrollmentId));
        return classEnrollments.filter((item) => !usedIds.has(item.id));
      })()
    : [];

  // TP coverage for the selected class-subject (if filtering by subject)
  const coverageRow = filters.subjectId ? activeRows.find((row) => row.subjectId === filters.subjectId) : null;
  const coverageEntries = coverageRow ? entries.filter((item) => item.classSubjectId === coverageRow.classSubjectId && item.active !== false) : [];
  const coverage = coverageRow ? [
    calculateInterventionCoverage(1, coverageRow.entry?.status === "final" ? coverageRow.entry.counts.TP1 ?? 0 : null, coverageEntries),
    calculateInterventionCoverage(2, coverageRow.entry?.status === "final" ? coverageRow.entry.counts.TP2 ?? 0 : null, coverageEntries),
  ] : [];

  return (
    <div className="mt-6 min-w-0 space-y-5">
      {/* Semester + Filter bar */}
      <section className="rounded-xl border border-border-default bg-surface-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-4">
          <fieldset className="min-w-0">
            <legend className="sr-only">Semester</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {(["1", "2"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-current={semester === item ? "page" : undefined}
                  onClick={() => navigate(buildFilterHref({}, item), pbdSemesterSwitchMessage(semester, item))}
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${semester === item ? "bg-primary-700 text-white" : "bg-surface-inset text-text-secondary hover:bg-surface-inset/80"}`}
                >
                  Sem {item}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block text-sm text-text-secondary">
              <span className="text-xs font-medium text-text-muted">Status</span>
              <select
                value={filters.status}
                onChange={(event) => navigate(buildFilterHref({ status: event.target.value || undefined }), "Perubahan belum disimpan. Tukar tapisan?")}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm"
              >
                <option value="all">Semua status</option>
                <option value="overdue">Lewat</option>
                <option value="needs_review">Perlu semakan</option>
                <option value="in_progress">Berjalan</option>
                <option value="planned">Dirancang</option>
                <option value="completed">Selesai</option>
              </select>
            </label>
            <label className="block text-sm text-text-secondary">
              <span className="text-xs font-medium text-text-muted">Subjek</span>
              <select
                value={filters.subjectId ?? ""}
                onChange={(event) => navigate(buildFilterHref({ subjectId: event.target.value || undefined }), "Perubahan belum disimpan. Tukar tapisan?")}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm"
              >
                <option value="">Semua subjek</option>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code}</option>)}
              </select>
            </label>
            <label className="block text-sm text-text-secondary">
              <span className="text-xs font-medium text-text-muted">Kelas</span>
              <select
                value={filters.classId ?? ""}
                onChange={(event) => navigate(buildFilterHref({ classId: event.target.value || undefined }), "Perubahan belum disimpan. Tukar tapisan?")}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm"
              >
                <option value="">Semua kelas</option>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="block text-sm text-text-secondary">
              <span className="text-xs font-medium text-text-muted">TP</span>
              <select
                value={filters.tp ? String(filters.tp) : ""}
                onChange={(event) => navigate(buildFilterHref({ tp: event.target.value || undefined }), "Perubahan belum disimpan. Tukar tapisan?")}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm"
              >
                <option value="">Semua TP</option>
                <option value="1">TP1</option>
                <option value="2">TP2</option>
              </select>
            </label>
            <label className="block text-sm text-text-secondary">
              <span className="text-xs font-medium text-text-muted">Semakan sebelum</span>
              <input
                type="date"
                value={filters.reviewBefore ?? ""}
                onChange={(event) => navigate(buildFilterHref({ reviewBefore: event.target.value || undefined }), "Perubahan belum disimpan. Tukar tapisan?")}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>

        {/* Metrics summary */}
        <div className="mt-4 flex flex-wrap gap-3 border-t border-border-default pt-3 text-sm">
          <span className="text-text-muted">{metrics.total} aktif</span>
          {metrics.overdue > 0 ? <span className="font-medium text-red-700">{metrics.overdue} lewat</span> : null}
          {metrics.needsReview > 0 ? <span className="font-medium text-amber-700">{metrics.needsReview} perlu semakan</span> : null}
          <span className="text-text-muted">{metrics.inProgress} berjalan</span>
          <span className="text-text-muted">{metrics.completed} selesai</span>
        </div>

        {/* TP coverage when filtering by subject */}
        {coverage.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-4 border-t border-border-default pt-3 text-sm">
            {coverage.map((item) => (
              <span key={item.tp} className={item.status === "complete" ? "text-teal-800" : item.status === "missing" || item.status === "excess" ? "text-amber-800" : "text-text-muted"}>
                {item.label}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {/* Work queue */}
      <section className="min-w-0">
        {filteredEntries.length === 0 ? (
          <div className="rounded-xl border border-border-default bg-surface-card p-8 text-center shadow-card">
            <p className="text-sm text-text-muted">Tiada rekod intervensi sepadan dengan tapisan semasa.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              return (
                <div key={entry.id ?? `${entry.classSubjectId}:${entry.classEnrollmentId}`}>
                  {isExpanded ? (
                    <InterventionEditor
                      year={year}
                      semester={semester}
                      entry={entry}
                      editorId={entry.id!}
                      onDirty={markDirty}
                      onClose={() => setExpandedId(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (hasDirty && expandedId) {
                          if (!window.confirm("Perubahan pada rekod terbuka belum disimpan. Buka rekod lain?")) return;
                        }
                        setExpandedId(entry.id ?? null);
                      }}
                      className="group flex w-full min-w-0 items-center gap-3 rounded-lg border border-border-default bg-surface-card px-4 py-3 text-left shadow-raised transition-colors hover:bg-surface-inset/50"
                    >
                      <ChevronRight className="h-4 w-4 shrink-0 text-text-disabled transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{entry.studentName}</span>
                      <span className="hidden shrink-0 text-sm text-text-muted sm:block">{entry.className}</span>
                      <span className="hidden shrink-0 text-sm text-text-muted md:block">{entry.subjectCode}</span>
                      <span className="shrink-0 text-sm font-medium tabular-nums text-text-secondary">TP{entry.tp}</span>
                      <StatusBadge entry={entry} />
                      {entry.reviewDueOn ? (
                        <span className={`hidden shrink-0 text-xs tabular-nums sm:block ${deriveOverdue(entry) ? "font-semibold text-red-700" : "text-text-muted"}`}>
                          {entry.reviewDueOn}
                        </span>
                      ) : null}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Archived entries */}
      {entries.some((item) => item.active === false) ? (
        <details className="rounded-xl border border-border-default bg-surface-card p-4 shadow-card">
          <summary className="cursor-pointer text-sm font-medium text-text-secondary">Rekod diarkibkan ({entries.filter((item) => item.active === false).length})</summary>
          <div className="mt-3 space-y-2">
            {entries.filter((item) => item.active === false).map((entry) => (
              <div key={entry.id} className="flex min-w-0 items-center gap-3 rounded-lg bg-surface-inset px-4 py-3">
                <span className="min-w-0 flex-1 truncate text-sm text-text-muted">{entry.studentName}</span>
                <span className="text-xs text-text-muted">{entry.className} · {entry.subjectCode} · TP{entry.tp}</span>
                <ArchiveRestoreForm entry={entry} />
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {/* New intervention */}
      {showNewForm && newFormClassSubjectId ? (
        <NewInterventionForm
          year={year}
          semester={semester}
          classSubjectId={newFormClassSubjectId}
          enrollments={newFormEnrollments}
          editorId="new-intervention"
          onDirty={markDirty}
        />
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowNewForm((current) => !current)}
          className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface-card px-4 py-2.5 text-sm font-medium text-text-secondary shadow-raised transition-colors hover:bg-surface-inset hover:text-text-primary"
        >
          <Plus className="h-4 w-4" />
          {showNewForm ? "Tutup borang" : "Tambah intervensi"}
        </button>
        {activeRows.length === 0 ? (
          <p className="text-sm text-text-muted">
            Tiada subjek ditetapkan. <Link className="font-medium text-primary-700 underline" href={`/school/setup?year=${year}&semester=${semester}&view=assignments`}>Buka Setup Sekolah</Link>.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ArchiveRestoreForm({ entry }: { entry: PbdInterventionEntry }) {
  const [state, action, pending] = useActionState(archiveInterventionAction, initialState);
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="interventionId" value={entry.id} />
      <input type="hidden" name="expectedRevision" value={entry.revision} />
      <input type="hidden" name="restore" value="true" />
      <button disabled={pending} className="text-sm font-medium text-primary-700 hover:text-primary-800 disabled:opacity-60">
        Pulihkan
      </button>
      {state.error ? <span className="text-xs text-red-700" role="alert">{state.error}</span> : null}
      {state.success ? <span className="text-xs text-teal-800" role="status">{state.success}</span> : null}
    </form>
  );
}
