import { describe, expect, it } from "vitest";
import { parseDatabasePbdEntryInput, validateDatabasePbdEntry } from "@/lib/db/pbd";

const base = {
  classSubjectId: "e51dfbd5-b8aa-448f-9066-2886a31ec00e",
  year: "2026",
  semester: "1",
  revision: "0",
  enrolledCount: "20",
  tp1: "1",
  tp2: "2",
  tp3: "3",
  tp4: "4",
  tp5: "5",
  tp6: "4",
  notAssessed: "1",
};

describe("database PBD entry validation", () => {
  it("keeps empty draft counts empty instead of coercing them to zero", () => {
    const entry = parseDatabasePbdEntryInput({ ...base, action: "save_draft", tp4: "", notAssessed: "" });
    expect(entry.tp4).toBeNull();
    expect(entry.notAssessed).toBeNull();
    expect(validateDatabasePbdEntry(entry)).toBeNull();
  });

  it("requires a complete, reconciled total before finalization", () => {
    const incomplete = parseDatabasePbdEntryInput({ ...base, action: "finalize", tp4: "" });
    expect(validateDatabasePbdEntry(incomplete)).toMatch(/Lengkapkan/);

    const mismatched = parseDatabasePbdEntryInput({ ...base, action: "finalize", tp6: "3" });
    expect(validateDatabasePbdEntry(mismatched)).toMatch(/Jumlah TP/);

    const complete = parseDatabasePbdEntryInput({ ...base, action: "finalize" });
    expect(validateDatabasePbdEntry(complete)).toBeNull();
  });
});
