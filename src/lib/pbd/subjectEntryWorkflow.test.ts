import { describe, expect, it } from "vitest";
import {
  emptySubjectEntryValues,
  fillSubjectEntryBlanks,
  revisionsMatch,
  selectSubjectForEntry,
  subjectEntryBalance,
  subjectEntryMatchesFilter,
  subjectEntryPercentage,
  subjectEntryRecoveryKey,
  subjectEntryState,
  subjectEntryTotal,
} from "@/lib/pbd/subjectEntryWorkflow";

describe("subject PBD entry workflow", () => {
  it("calculates totals, percentages and balancing feedback", () => {
    const values = { ...emptySubjectEntryValues(), tp1: "2", tp2: "3", tp3: "5", tp4: "10", tp5: "0", tp6: "0", notAssessed: "0" };
    expect(subjectEntryTotal(values)).toBe(20);
    expect(subjectEntryPercentage("5", 20)).toBe(25);
    expect(subjectEntryBalance(values, 20)).toEqual({ kind: "complete", label: "Lengkap" });
    expect(subjectEntryBalance({ ...values, tp4: "8" }, 20).label).toBe("Baki 2 murid");
    expect(subjectEntryBalance({ ...values, tp4: "12" }, 20).label).toBe("Lebih 2 murid");
  });

  it("classifies rows and fills only blank fields", () => {
    const empty = emptySubjectEntryValues();
    expect(subjectEntryState(empty, 20, false)).toBe("empty");
    const filled = fillSubjectEntryBlanks({ ...empty, tp1: "4" });
    expect(filled.tp1).toBe("4");
    expect(filled.tp2).toBe("0");
    expect(subjectEntryState({ ...filled, tp2: "16" }, 20, false)).toBe("ready");
    expect(subjectEntryState(filled, 20, true)).toBe("final");
    expect(subjectEntryMatchesFilter("empty", "unfinished")).toBe(true);
    expect(subjectEntryMatchesFilter("ready", "unfinished")).toBe(true);
    expect(subjectEntryMatchesFilter("final", "unfinished")).toBe(false);
    expect(subjectEntryMatchesFilter("final", "all")).toBe(true);
  });

  it("scopes recovery and rejects stale revision sets", () => {
    expect(subjectEntryRecoveryKey("school-a", "2026", "1", "subject-a")).toBe("pbd-subject-entry:school-a:2026:1:subject-a");
    expect(revisionsMatch({ a: 1, b: 0 }, { b: 0, a: 1 })).toBe(true);
    expect(revisionsMatch({ a: 2, b: 0 }, { a: 1, b: 0 })).toBe(false);
    expect(revisionsMatch({ a: 1 }, { a: 1, b: 0 })).toBe(false);
  });

  it("keeps subject links compatible with old class bookmarks", () => {
    const assignments = [{ classId: "class-a", subjectId: "subject-b" }];
    expect(selectSubjectForEntry(["subject-a", "subject-b"], "subject-b", undefined, assignments)).toBe("subject-b");
    expect(selectSubjectForEntry(["subject-a", "subject-b"], "missing", "class-a", assignments)).toBe("subject-b");
    expect(selectSubjectForEntry(["subject-a", "subject-b"], "missing", "missing", assignments)).toBe("subject-a");
  });
});
