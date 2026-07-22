import type { InterventionWorkflowStatus, PbdInterventionEntry } from "@/types/intervention";

const VALID_STATUSES: InterventionWorkflowStatus[] = ["planned", "in_progress", "needs_review", "completed"];

export function isValidWorkflowStatus(value: string): value is InterventionWorkflowStatus {
  return (VALID_STATUSES as string[]).includes(value);
}

/**
 * Returns the effective workflow status for an entry, defaulting to "planned"
 * for legacy records (Google Sheets or pre-migration DB rows).
 */
export function effectiveStatus(entry: Pick<PbdInterventionEntry, "workflowStatus">): InterventionWorkflowStatus {
  return entry.workflowStatus ?? "planned";
}

/**
 * Derives whether an intervention is overdue: review_due_on has passed
 * and the record is not completed (and is active).
 */
export function deriveOverdue(
  entry: Pick<PbdInterventionEntry, "workflowStatus" | "reviewDueOn" | "active">,
  today: Date = new Date(),
): boolean {
  if (entry.active === false) return false;
  if (!entry.reviewDueOn) return false;
  if (effectiveStatus(entry) === "completed") return false;
  const due = new Date(`${entry.reviewDueOn}T00:00:00`);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return due < todayStart;
}

/**
 * Priority bucket for queue ordering:
 * 0 = overdue, 1 = needs_review, 2 = in_progress, 3 = planned, 4 = completed
 */
export function queuePriorityBucket(
  entry: Pick<PbdInterventionEntry, "workflowStatus" | "reviewDueOn" | "active">,
  today?: Date,
): number {
  if (deriveOverdue(entry, today)) return 0;
  const status = effectiveStatus(entry);
  if (status === "needs_review") return 1;
  if (status === "in_progress") return 2;
  if (status === "completed") return 4;
  return 3; // planned
}

/**
 * Comparator for sorting the work queue.
 * Primary: priority bucket ascending.
 * Secondary: reviewDueOn ascending (nulls last).
 * Tertiary: student name locale compare.
 */
export function compareQueueOrder(
  a: Pick<PbdInterventionEntry, "workflowStatus" | "reviewDueOn" | "active" | "studentName">,
  b: Pick<PbdInterventionEntry, "workflowStatus" | "reviewDueOn" | "active" | "studentName">,
  today?: Date,
): number {
  const bucketDiff = queuePriorityBucket(a, today) - queuePriorityBucket(b, today);
  if (bucketDiff !== 0) return bucketDiff;
  const aDue = a.reviewDueOn ?? "";
  const bDue = b.reviewDueOn ?? "";
  if (aDue && bDue && aDue !== bDue) return aDue < bDue ? -1 : 1;
  if (aDue && !bDue) return -1;
  if (!aDue && bDue) return 1;
  return a.studentName.localeCompare(b.studentName, "ms");
}

/**
 * Validates that an intervention can be marked completed.
 * Returns an error message string, or null if valid.
 */
export function validateCompletion(input: {
  workflowStatus?: string;
  followUpNote?: string | null;
  reviewDueOn?: string | null;
}): string | null {
  if (input.workflowStatus !== "completed") return null;
  if (!input.followUpNote || input.followUpNote.trim().length === 0) {
    return "Nota susulan diperlukan sebelum menandakan intervensi sebagai selesai.";
  }
  if (!input.reviewDueOn) {
    return "Tarikh semakan diperlukan sebelum menandakan intervensi sebagai selesai.";
  }
  return null;
}

export type QueueFilters = {
  status: InterventionWorkflowStatus | "overdue" | "all";
  subjectId: string | null;
  classId: string | null;
  tp: 1 | 2 | null;
  reviewBefore: string | null;
};

/**
 * Parses URL search params into typed queue filters.
 */
export function parseQueueFilters(params: {
  status?: string | null;
  subjectId?: string | null;
  classId?: string | null;
  tp?: string | null;
  reviewBefore?: string | null;
}): QueueFilters {
  let status: QueueFilters["status"] = "all";
  if (params.status === "overdue") status = "overdue";
  else if (params.status && isValidWorkflowStatus(params.status)) status = params.status;

  const tp = params.tp === "1" ? 1 : params.tp === "2" ? 2 : null;
  const reviewBefore = params.reviewBefore && /^\d{4}-\d{2}-\d{2}$/.test(params.reviewBefore) ? params.reviewBefore : null;

  return {
    status,
    subjectId: params.subjectId || null,
    classId: params.classId || null,
    tp,
    reviewBefore,
  };
}

/**
 * Applies queue filters to a list of entries.
 */
export function applyQueueFilters(
  entries: PbdInterventionEntry[],
  filters: QueueFilters,
  today?: Date,
): PbdInterventionEntry[] {
  return entries.filter((entry) => {
    if (entry.active === false) return false;
    if (filters.status === "overdue" && !deriveOverdue(entry, today)) return false;
    if (filters.status !== "all" && filters.status !== "overdue" && effectiveStatus(entry) !== filters.status) return false;
    if (filters.subjectId && entry.subjectId !== filters.subjectId) return false;
    if (filters.classId && entry.classId !== filters.classId) return false;
    if (filters.tp && entry.tp !== filters.tp) return false;
    if (filters.reviewBefore && (!entry.reviewDueOn || entry.reviewDueOn > filters.reviewBefore)) return false;
    return true;
  });
}
