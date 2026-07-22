"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Lock, RotateCcw, Save } from "lucide-react";
import type { AssessmentEntryStatus, EntryGridStudent } from "@/lib/db/assessmentEntry";
import {
  finalizeAssessmentEntryAction,
  reopenAssessmentEntryAction,
  saveAssessmentMarksAction,
  type AssessmentEntryActionState,
} from "@/app/assessments/[year]/[assessment]/entry/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, TableShell, TD, TH, THead, TRow } from "@/components/ui/table";

type Props = {
  year: string;
  assessmentType: "upsa" | "uasa";
  classId: string;
  subjectId: string;
  students: EntryGridStudent[];
  status: AssessmentEntryStatus | null;
  subjectCode: string;
  subjectName: string;
  className: string;
};

type MarkEntry = { mark: string; absent: boolean };

const initialState: AssessmentEntryActionState = {};

function recoveryKey(year: string, assessmentType: string, classId: string, subjectId: string) {
  return `assessment-entry:${year}:${assessmentType}:${classId}:${subjectId}`;
}

export function AssessmentEntryGrid({ year, assessmentType, classId, subjectId, students, status }: Props) {
  const revision = status?.revision ?? 0;
  const isFinal = status?.status === "final";

  // Initialize entries from server data or localStorage draft recovery
  const [recoveredFromDraft] = useState(() => {
    try {
      const stored = localStorage.getItem(recoveryKey(year, assessmentType, classId, subjectId));
      if (stored) {
        const parsed = JSON.parse(stored) as { revision: number; entries: Record<string, MarkEntry> };
        if (parsed.revision === revision) {
          localStorage.removeItem(recoveryKey(year, assessmentType, classId, subjectId));
          return parsed.entries;
        }
        localStorage.removeItem(recoveryKey(year, assessmentType, classId, subjectId));
      }
    } catch { /* ignore */ }
    return null;
  });
  const [entries, setEntries] = useState<Record<string, MarkEntry>>(() => {
    if (recoveredFromDraft) return recoveredFromDraft;
    const initial: Record<string, MarkEntry> = {};
    for (const student of students) {
      initial[student.enrollmentId] = {
        mark: student.mark !== null ? String(student.mark) : "",
        absent: student.status === "absent",
      };
    }
    return initial;
  });
  const [dirty, setDirty] = useState(recoveredFromDraft !== null);
  const [recoveryNotice] = useState(recoveredFromDraft ? "Draf tempatan dipulihkan." : "");
  const [saveState, saveAction, savePending] = useActionState(saveAssessmentMarksAction, initialState);
  const [finalizeState, , finalizePending] = useActionState(finalizeAssessmentEntryAction, initialState);
  const [reopenState, , reopenPending] = useActionState(reopenAssessmentEntryAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // When a fresh successful save arrives, clear the dirty flag so a subsequent
  // edit is recognised as new unsaved changes. Previously saveState.success
  // stayed set forever, which kept isDirty false and the save button disabled
  // after the first successful save, so a teacher could not save a second
  // correction without reloading. Uses React's render-phase state adjustment
  // pattern (track the last handled save revision in state) rather than an
  // effect or a ref read during render.
  const [lastSavedRevision, setLastSavedRevision] = useState<number | undefined>(undefined);
  if (saveState.success && saveState.revision !== undefined && saveState.revision !== lastSavedRevision) {
    setLastSavedRevision(saveState.revision);
    setDirty(false);
  }
  // Derive effective revision from action results (avoids setState-in-effect)
  const currentRevision = reopenState.revision ?? finalizeState.revision ?? saveState.revision ?? revision;
  const isFinalNow = finalizeState.status === "final" ? true : reopenState.status === "draft" ? false : isFinal;
  const isDirty = dirty;

  // Persist draft to localStorage on change
  useEffect(() => {
    if (!isDirty) return;
    const key = recoveryKey(year, assessmentType, classId, subjectId);
    const timer = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify({ revision: currentRevision, entries }));
    }, 500);
    return () => clearTimeout(timer);
  }, [isDirty, entries, currentRevision, year, assessmentType, classId, subjectId]);

  const updateEntry = useCallback((enrollmentId: string, patch: Partial<MarkEntry>) => {
    setEntries((prev) => ({ ...prev, [enrollmentId]: { ...prev[enrollmentId], ...patch } }));
    setDirty(true);
  }, []);

  const markedCount = Object.values(entries).filter((e) => !e.absent && e.mark !== "").length;
  const absentCount = Object.values(entries).filter((e) => e.absent).length;
  const completeCount = markedCount + absentCount;
  const allComplete = completeCount === students.length && students.length > 0;
  const error = saveState.error || finalizeState.error || reopenState.error;
  const success = saveState.success || finalizeState.success || reopenState.success;
  const pending = savePending || finalizePending || reopenPending;

  return (
    <div className="mt-6">
      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-3">
        {isFinalNow ? (
          <Badge tone="success" icon={Lock}>Muktamad</Badge>
        ) : (
          <Badge tone="warning">Draf · {completeCount}/{students.length} diisi</Badge>
        )}
        {isDirty && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent-500" aria-hidden="true" />
            Perubahan belum disimpan
          </span>
        )}
        {saveState.savedAt && !isDirty && <span className="text-xs text-text-disabled">Disimpan {saveState.savedAt}</span>}
      </div>

      {/* Feedback messages */}
      {error ? <Alert variant="danger" className="mt-3">{error}</Alert> : null}
      {success && !error && !isDirty ? <Alert variant="success" className="mt-3">{success}</Alert> : null}
      {recoveryNotice ? <Alert variant="info" className="mt-3">{recoveryNotice}</Alert> : null}

      {/* Entry form */}
      <form ref={formRef} action={saveAction} className="mt-4">
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="assessmentType" value={assessmentType} />
        <input type="hidden" name="classId" value={classId} />
        <input type="hidden" name="subjectId" value={subjectId} />
        <input type="hidden" name="expectedRevision" value={currentRevision} />

        <TableShell>
          <DataTable>
            <THead>
              <tr>
                <TH align="center" className="w-14">Bil</TH>
                <TH>Nama Murid</TH>
                <TH align="center" className="w-32">Markah /100</TH>
                <TH align="center" className="w-20">TH</TH>
              </tr>
            </THead>
            <tbody>
              {students.map((student, index) => {
                const entry = entries[student.enrollmentId] ?? { mark: "", absent: false };
                return (
                  <TRow key={student.enrollmentId} hover={!isFinalNow} className={entry.absent ? "bg-surface-inset/70" : index % 2 === 1 ? "bg-surface-inset/30" : ""}>
                    <TD align="center" className="tabular-nums text-text-disabled">{student.rosterNumber ?? index + 1}</TD>
                    <TD className={`font-medium ${entry.absent ? "text-text-disabled line-through" : "text-text-primary"}`}>{student.displayName}</TD>
                    <TD align="center">
                      <input
                        type="number"
                        name={`mark:${student.enrollmentId}`}
                        value={entry.mark}
                        min={0}
                        max={100}
                        step={1}
                        disabled={isFinalNow || entry.absent}
                        onChange={(e) => updateEntry(student.enrollmentId, { mark: e.target.value })}
                        className="h-11 w-24 rounded-lg border border-border-strong bg-surface-card text-center text-sm font-semibold tabular-nums text-text-primary shadow-raised transition-[border-color,box-shadow] focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:bg-surface-inset disabled:text-text-disabled"
                        aria-label={`Markah ${student.displayName}`}
                      />
                    </TD>
                    <TD align="center">
                      <input
                        type="checkbox"
                        name={`absent:${student.enrollmentId}`}
                        value="true"
                        checked={entry.absent}
                        disabled={isFinalNow}
                        onChange={(e) => updateEntry(student.enrollmentId, { absent: e.target.checked, mark: e.target.checked ? "" : entry.mark })}
                        className="h-5 w-5 cursor-pointer rounded border-border-strong accent-[var(--primary-600)] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Tidak hadir ${student.displayName}`}
                      />
                    </TD>
                    {/* Hidden fields for form submission */}
                    <input type="hidden" name="enrollmentId" value={student.enrollmentId} />
                    <input type="hidden" name={`studentId:${student.enrollmentId}`} value={student.studentId} />
                  </TRow>
                );
              })}
            </tbody>
          </DataTable>
        </TableShell>

        {/* Action buttons */}
        {!isFinalNow && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" icon={Save} disabled={pending || !isDirty} loading={savePending}>
              {savePending ? "Menyimpan..." : "Simpan Draf"}
            </Button>
            <Button
              variant="secondary"
              icon={CheckCircle2}
              disabled={pending || !allComplete || isDirty}
              loading={finalizePending}
              onClick={() => {
                if (formRef.current) {
                  const fd = new FormData(formRef.current);
                  finalizeAssessmentEntryAction(finalizeState, fd);
                }
              }}
              title={isDirty ? "Simpan draf terlebih dahulu sebelum memuktamadkan" : allComplete ? "Muktamadkan pengisian ini" : "Lengkapkan semua markah atau TH terlebih dahulu"}
            >
              {finalizePending ? "Memuktamadkan..." : "Muktamadkan"}
            </Button>
          </div>
        )}

        {isFinalNow && (
          <div className="mt-4">
            <Button
              variant="outline"
              icon={RotateCcw}
              disabled={pending}
              loading={reopenPending}
              onClick={() => {
                const fd = new FormData();
                fd.set("year", year);
                fd.set("assessmentType", assessmentType);
                fd.set("classId", classId);
                fd.set("subjectId", subjectId);
                fd.set("expectedRevision", String(currentRevision));
                reopenAssessmentEntryAction(reopenState, fd);
              }}
            >
              {reopenPending ? "Membuka semula..." : "Buka Semula"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
