import { describe, expect, it } from "vitest";
import {
  emptyPbdEntryValues,
  entryPasteErrorMessages,
  fillPbdEntryBlanks,
  parseEntryPaste,
  pbdEntryBalance,
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
  resolvePbdEntryMode,
  revisionsMatch,
  selectClassForEntry,
  selectSubjectForEntry,
  sortClassesForEntry,
} from "@/lib/pbd/entryWorkflow";

describe("PBD entry workflow", () => {
  it("calculates totals, percentages and balancing feedback", () => {
    const values = { ...emptyPbdEntryValues(), tp1: "2", tp2: "3", tp3: "5", tp4: "10", tp5: "0", tp6: "0", notAssessed: "0" };
    expect(pbdEntryTotal(values)).toBe(20);
    expect(pbdEntryPercentage("5", 20)).toBe(25);
    expect(pbdEntryBalance(values, 20)).toEqual({ kind: "complete", label: "Lengkap" });
    expect(pbdEntryBalance({ ...values, tp4: "8" }, 20).label).toBe("Baki 2 murid");
    expect(pbdEntryBalance({ ...values, tp4: "12" }, 20).label).toBe("Lebih 2 murid");
  });

  it("classifies rows and fills only blank fields", () => {
    const empty = emptyPbdEntryValues();
    expect(pbdEntryState(empty, 20, false)).toBe("empty");
    const filled = fillPbdEntryBlanks({ ...empty, tp1: "4" });
    expect(filled.tp1).toBe("4");
    expect(filled.tp2).toBe("0");
    expect(pbdEntryState({ ...filled, tp2: "16" }, 20, false)).toBe("ready");
    expect(pbdEntryState(filled, 20, true)).toBe("final");
    expect(pbdEntryMatchesFilter("empty", "unfinished")).toBe(true);
    expect(pbdEntryMatchesFilter("ready", "unfinished")).toBe(true);
    expect(pbdEntryMatchesFilter("final", "unfinished")).toBe(false);
    expect(pbdEntryMatchesFilter("final", "all")).toBe(true);
  });

  it("uses the agreed Malay status language", () => {
    expect(pbdEntryStatusLabel("empty")).toBe("Belum diisi");
    expect(pbdEntryStatusLabel("mismatch")).toBe("Perlu semakan");
    expect(pbdEntryStatusLabel("ready")).toBe("Sedia dimuktamadkan");
    expect(pbdEntryStatusLabel("final")).toBe("Muktamad");
  });

  it("defaults to subject mode and accepts explicit class view", () => {
    expect(resolvePbdEntryMode(undefined)).toBe("subject");
    expect(resolvePbdEntryMode(null)).toBe("subject");
    expect(resolvePbdEntryMode("subject")).toBe("subject");
    expect(resolvePbdEntryMode("class")).toBe("class");
    expect(resolvePbdEntryMode("anything-else")).toBe("subject");
  });

  it("scopes recovery keys by school, year, semester, mode and selection", () => {
    expect(pbdEntryRecoveryKey("school-a", "2026", "1", "subject", "subject-a")).toBe("pbd-entry:school-a:2026:1:subject:subject-a");
    expect(pbdEntryRecoveryKey("school-a", "2026", "1", "class", "class-a")).toBe("pbd-entry:school-a:2026:1:class:class-a");
    expect(pbdEntryRecoveryKey("school-a", "2026", "2", "subject", "subject-a"))
      .not.toBe(pbdEntryRecoveryKey("school-a", "2026", "1", "subject", "subject-a"));
    expect(pbdEntryRecoveryKey("school-b", "2026", "1", "subject", "subject-a"))
      .not.toBe(pbdEntryRecoveryKey("school-a", "2026", "1", "subject", "subject-a"));
  });

  it("rejects stale revision sets", () => {
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

  it("selects classes with subject bookmarks as a legacy fallback", () => {
    const assignments = [{ classId: "class-b", subjectId: "subject-a" }];
    expect(selectClassForEntry(["class-a", "class-b"], "class-b", undefined, assignments)).toBe("class-b");
    expect(selectClassForEntry(["class-a", "class-b"], "missing", "subject-a", assignments)).toBe("class-b");
    expect(selectClassForEntry(["class-a", "class-b"], "missing", "missing", assignments)).toBe("class-a");
    expect(selectClassForEntry([], "class-a", undefined, assignments)).toBeNull();
  });

  it("sorts classes by level kind, level number and Malay name", () => {
    const sorted = sortClassesForEntry([
      { id: "c1", name: "2 Bestari", levelKind: "tahun", levelNumber: 2 },
      { id: "c2", name: "1 Angsana", levelKind: "tahun", levelNumber: 1 },
      { id: "c3", name: "Peralihan A", levelKind: "peralihan", levelNumber: null },
      { id: "c4", name: "4 Cerdik", levelKind: "tingkatan", levelNumber: 4 },
      { id: "c5", name: "1 Bestari", levelKind: "tahun", levelNumber: 1 },
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["c2", "c5", "c1", "c3", "c4"]);
  });

  it("names the unit being saved in each mode", () => {
    expect(pbdEntrySaveFeedback("subject", 5, "1", "3:42 petang")).toBe("5 kelas disimpan untuk Semester 1 pada 3:42 petang.");
    expect(pbdEntrySaveFeedback("class", 3, "2", "3:42 petang")).toBe("3 subjek disimpan untuk Semester 2 pada 3:42 petang.");
    expect(pbdEntrySaveFeedback("class", 0, "2", "3:42 petang")).toBe("Tiada perubahan baharu untuk Semester 2.");
    expect(pbdSemesterSwitchMessage("1", "2")).toBe("Perubahan Semester 1 belum disimpan. Tukar ke Semester 2?");
    expect(pbdModeSwitchMessage("class")).toContain("mengikut kelas");
    expect(pbdModeSwitchMessage("subject")).toContain("mengikut subjek");
  });

  it("builds mode-aware entry hrefs that preserve the exact task", () => {
    expect(pbdEntryHref({ year: "2026", semester: "1", mode: "subject", selectionId: "s1" }))
      .toBe("/pbd/entry?year=2026&semester=1&view=subject&subjectId=s1");
    expect(pbdEntryHref({ year: "2026", semester: "2", mode: "class", selectionId: "c1" }))
      .toBe("/pbd/entry?year=2026&semester=2&view=class&classId=c1");
    expect(pbdEntryHref({ year: "2026", semester: "1", mode: "subject" }))
      .toBe("/pbd/entry?year=2026&semester=1&view=subject");
  });
});

describe("PBD entry clipboard parsing", () => {
  it("parses a tab and newline grid from a spreadsheet", () => {
    const result = parseEntryPaste("1\t2\t3\t4\t5\t6\t0\n0\t0\t10\t10\t10\t0\t0");
    expect(result).toEqual({
      ok: true,
      grid: [
        ["1", "2", "3", "4", "5", "6", "0"],
        ["0", "0", "10", "10", "10", "0", "0"],
      ],
    });
  });

  it("normalises CRLF, trims trailing blank lines and cell whitespace", () => {
    const result = parseEntryPaste(" 1 \t2\r\n3\t4\r\n\r\n");
    expect(result).toEqual({ ok: true, grid: [["1", "2"], ["3", "4"]] });
  });

  it("keeps empty cells so existing values can be preserved on apply", () => {
    const result = parseEntryPaste("5\t\t7");
    expect(result).toEqual({ ok: true, grid: [["5", "", "7"]] });
  });

  it("rejects negative, decimal, signed and text values before any change", () => {
    expect(parseEntryPaste("-1")).toEqual({ ok: false, reason: "values" });
    expect(parseEntryPaste("1.5")).toEqual({ ok: false, reason: "values" });
    expect(parseEntryPaste("+2")).toEqual({ ok: false, reason: "values" });
    expect(parseEntryPaste("1\tabc")).toEqual({ ok: false, reason: "values" });
    expect(parseEntryPaste("1e2")).toEqual({ ok: false, reason: "values" });
  });

  it("rejects grids wider than the TP columns and empty payloads", () => {
    expect(parseEntryPaste("1\t2\t3\t4\t5\t6\t7\t8")).toEqual({ ok: false, reason: "columns" });
    expect(parseEntryPaste("")).toEqual({ ok: false, reason: "empty" });
    expect(parseEntryPaste("\n\n")).toEqual({ ok: false, reason: "empty" });
  });

  it("exposes a Malay error message for every rejection reason", () => {
    expect(entryPasteErrorMessages.values).toBeTruthy();
    expect(entryPasteErrorMessages.columns).toBeTruthy();
    expect(entryPasteErrorMessages.empty).toBeTruthy();
  });
});
