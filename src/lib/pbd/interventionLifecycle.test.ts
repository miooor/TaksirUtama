import { describe, expect, it } from "vitest";
import {
  applyQueueFilters,
  compareQueueOrder,
  deriveOverdue,
  effectiveStatus,
  isValidWorkflowStatus,
  parseQueueFilters,
  queuePriorityBucket,
  validateCompletion,
} from "@/lib/pbd/interventionLifecycle";
import type { PbdInterventionEntry } from "@/types/intervention";

const TODAY = new Date(2026, 6, 22); // 2026-07-22

function entry(overrides: Partial<PbdInterventionEntry> = {}): PbdInterventionEntry {
  return {
    subjectCode: "BM",
    studentName: "Ali Ahmad",
    normalizedStudentName: "ALI AHMAD",
    className: "4 Angsana",
    normalizedClassName: "4 ANGSANA",
    year: 4,
    tp: 2,
    problem: "Masalah membaca",
    intervention: "Intervensi berfokus",
    active: true,
    ...overrides,
  };
}

describe("interventionLifecycle", () => {
  describe("isValidWorkflowStatus", () => {
    it("accepts valid statuses", () => {
      expect(isValidWorkflowStatus("planned")).toBe(true);
      expect(isValidWorkflowStatus("in_progress")).toBe(true);
      expect(isValidWorkflowStatus("needs_review")).toBe(true);
      expect(isValidWorkflowStatus("completed")).toBe(true);
    });

    it("rejects invalid statuses", () => {
      expect(isValidWorkflowStatus("done")).toBe(false);
      expect(isValidWorkflowStatus("")).toBe(false);
      expect(isValidWorkflowStatus("PLANNED")).toBe(false);
    });
  });

  describe("effectiveStatus", () => {
    it("returns the workflowStatus when present", () => {
      expect(effectiveStatus({ workflowStatus: "in_progress" })).toBe("in_progress");
    });

    it("defaults to planned for legacy records", () => {
      expect(effectiveStatus({})).toBe("planned");
      expect(effectiveStatus({ workflowStatus: undefined })).toBe("planned");
    });
  });

  describe("deriveOverdue", () => {
    it("returns true when review date has passed and not completed", () => {
      expect(deriveOverdue({ workflowStatus: "in_progress", reviewDueOn: "2026-07-20", active: true }, TODAY)).toBe(true);
      expect(deriveOverdue({ workflowStatus: "planned", reviewDueOn: "2026-07-21", active: true }, TODAY)).toBe(true);
      expect(deriveOverdue({ reviewDueOn: "2026-07-01", active: true }, TODAY)).toBe(true);
    });

    it("returns false when completed", () => {
      expect(deriveOverdue({ workflowStatus: "completed", reviewDueOn: "2026-07-20", active: true }, TODAY)).toBe(false);
    });

    it("returns false when no review date", () => {
      expect(deriveOverdue({ workflowStatus: "in_progress", reviewDueOn: null, active: true }, TODAY)).toBe(false);
      expect(deriveOverdue({ workflowStatus: "in_progress", active: true }, TODAY)).toBe(false);
    });

    it("returns false when review date is today or future", () => {
      expect(deriveOverdue({ workflowStatus: "in_progress", reviewDueOn: "2026-07-22", active: true }, TODAY)).toBe(false);
      expect(deriveOverdue({ workflowStatus: "in_progress", reviewDueOn: "2026-07-23", active: true }, TODAY)).toBe(false);
    });

    it("returns false for archived records", () => {
      expect(deriveOverdue({ workflowStatus: "in_progress", reviewDueOn: "2026-07-20", active: false }, TODAY)).toBe(false);
    });
  });

  describe("queuePriorityBucket", () => {
    it("assigns bucket 0 to overdue", () => {
      expect(queuePriorityBucket({ workflowStatus: "in_progress", reviewDueOn: "2026-07-20", active: true }, TODAY)).toBe(0);
    });

    it("assigns bucket 1 to needs_review", () => {
      expect(queuePriorityBucket({ workflowStatus: "needs_review", reviewDueOn: null, active: true }, TODAY)).toBe(1);
    });

    it("assigns bucket 2 to in_progress", () => {
      expect(queuePriorityBucket({ workflowStatus: "in_progress", reviewDueOn: "2026-08-01", active: true }, TODAY)).toBe(2);
    });

    it("assigns bucket 3 to planned", () => {
      expect(queuePriorityBucket({ workflowStatus: "planned", reviewDueOn: null, active: true }, TODAY)).toBe(3);
      expect(queuePriorityBucket({ active: true }, TODAY)).toBe(3);
    });

    it("assigns bucket 4 to completed", () => {
      expect(queuePriorityBucket({ workflowStatus: "completed", reviewDueOn: "2026-07-20", active: true }, TODAY)).toBe(4);
    });
  });

  describe("compareQueueOrder", () => {
    it("sorts overdue before needs_review before in_progress before planned before completed", () => {
      const entries = [
        entry({ studentName: "Z", workflowStatus: "completed", reviewDueOn: "2026-07-20" }),
        entry({ studentName: "Y", workflowStatus: "planned" }),
        entry({ studentName: "X", workflowStatus: "in_progress", reviewDueOn: "2026-08-01" }),
        entry({ studentName: "W", workflowStatus: "needs_review" }),
        entry({ studentName: "V", workflowStatus: "in_progress", reviewDueOn: "2026-07-20" }),
      ];
      const sorted = [...entries].sort((a, b) => compareQueueOrder(a, b, TODAY));
      expect(sorted.map((item) => item.studentName)).toEqual(["V", "W", "X", "Y", "Z"]);
    });

    it("sorts by reviewDueOn ascending within same bucket", () => {
      const entries = [
        entry({ studentName: "B", workflowStatus: "in_progress", reviewDueOn: "2026-08-10" }),
        entry({ studentName: "A", workflowStatus: "in_progress", reviewDueOn: "2026-08-01" }),
        entry({ studentName: "C", workflowStatus: "in_progress", reviewDueOn: null }),
      ];
      const sorted = [...entries].sort((a, b) => compareQueueOrder(a, b, TODAY));
      expect(sorted.map((item) => item.studentName)).toEqual(["A", "B", "C"]);
    });
  });

  describe("validateCompletion", () => {
    it("returns null for non-completed statuses", () => {
      expect(validateCompletion({ workflowStatus: "planned" })).toBeNull();
      expect(validateCompletion({ workflowStatus: "in_progress" })).toBeNull();
      expect(validateCompletion({})).toBeNull();
    });

    it("requires follow_up_note for completed", () => {
      expect(validateCompletion({ workflowStatus: "completed", reviewDueOn: "2026-07-22", followUpNote: null })).toBeTruthy();
      expect(validateCompletion({ workflowStatus: "completed", reviewDueOn: "2026-07-22", followUpNote: "" })).toBeTruthy();
      expect(validateCompletion({ workflowStatus: "completed", reviewDueOn: "2026-07-22", followUpNote: "  " })).toBeTruthy();
    });

    it("requires review_due_on for completed", () => {
      expect(validateCompletion({ workflowStatus: "completed", followUpNote: "Done", reviewDueOn: null })).toBeTruthy();
    });

    it("returns null when both are present", () => {
      expect(validateCompletion({ workflowStatus: "completed", followUpNote: "Done", reviewDueOn: "2026-07-22" })).toBeNull();
    });
  });

  describe("parseQueueFilters", () => {
    it("parses valid status filters", () => {
      expect(parseQueueFilters({ status: "overdue" }).status).toBe("overdue");
      expect(parseQueueFilters({ status: "needs_review" }).status).toBe("needs_review");
      expect(parseQueueFilters({ status: "completed" }).status).toBe("completed");
    });

    it("defaults invalid status to all", () => {
      expect(parseQueueFilters({ status: "invalid" }).status).toBe("all");
      expect(parseQueueFilters({}).status).toBe("all");
      expect(parseQueueFilters({ status: null }).status).toBe("all");
    });

    it("parses TP filter", () => {
      expect(parseQueueFilters({ tp: "1" }).tp).toBe(1);
      expect(parseQueueFilters({ tp: "2" }).tp).toBe(2);
      expect(parseQueueFilters({ tp: "3" }).tp).toBeNull();
      expect(parseQueueFilters({}).tp).toBeNull();
    });

    it("parses subjectId and classId", () => {
      expect(parseQueueFilters({ subjectId: "abc-123" }).subjectId).toBe("abc-123");
      expect(parseQueueFilters({ classId: "def-456" }).classId).toBe("def-456");
      expect(parseQueueFilters({ subjectId: "" }).subjectId).toBeNull();
    });
  });

  describe("applyQueueFilters", () => {
    const entries = [
      entry({ id: "1", subjectId: "s1", classId: "c1", tp: 1, workflowStatus: "in_progress", reviewDueOn: "2026-07-20" }),
      entry({ id: "2", subjectId: "s1", classId: "c1", tp: 2, workflowStatus: "needs_review" }),
      entry({ id: "3", subjectId: "s2", classId: "c2", tp: 1, workflowStatus: "completed", reviewDueOn: "2026-07-20" }),
      entry({ id: "4", subjectId: "s2", classId: "c2", tp: 2, workflowStatus: "planned", active: false }),
    ];

    it("filters by overdue status", () => {
      const result = applyQueueFilters(entries, parseQueueFilters({ status: "overdue" }), TODAY);
      expect(result.map((item) => item.id)).toEqual(["1"]);
    });

    it("filters by workflow status", () => {
      const result = applyQueueFilters(entries, parseQueueFilters({ status: "needs_review" }), TODAY);
      expect(result.map((item) => item.id)).toEqual(["2"]);
    });

    it("filters by subjectId", () => {
      const result = applyQueueFilters(entries, parseQueueFilters({ subjectId: "s1" }), TODAY);
      expect(result.map((item) => item.id)).toEqual(["1", "2"]);
    });

    it("filters by TP", () => {
      const result = applyQueueFilters(entries, parseQueueFilters({ tp: "1" }), TODAY);
      expect(result.map((item) => item.id)).toEqual(["1", "3"]);
    });

    it("excludes archived entries", () => {
      const result = applyQueueFilters(entries, parseQueueFilters({}), TODAY);
      expect(result.map((item) => item.id)).toEqual(["1", "2", "3"]);
    });

    it("combines multiple filters", () => {
      const result = applyQueueFilters(entries, parseQueueFilters({ subjectId: "s1", tp: "1" }), TODAY);
      expect(result.map((item) => item.id)).toEqual(["1"]);
    });

    it("filters by reviewBefore date", () => {
      const result = applyQueueFilters(entries, parseQueueFilters({ reviewBefore: "2026-07-20" }), TODAY);
      expect(result.map((item) => item.id)).toEqual(["1", "3"]);
    });

    it("excludes entries without reviewDueOn when reviewBefore is set", () => {
      const result = applyQueueFilters(entries, parseQueueFilters({ reviewBefore: "2026-08-01" }), TODAY);
      expect(result.map((item) => item.id)).toEqual(["1", "3"]);
    });
  });
});
