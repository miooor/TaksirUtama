import { describe, expect, it } from "vitest";
import { matchPupils, flattenResults, type AssessmentResultEntry } from "./matchPupils";

function entry(overrides: Partial<AssessmentResultEntry> = {}): AssessmentResultEntry {
  return {
    studentId: "s1",
    displayName: "Ali",
    className: "4 Angsana",
    subjectCode: "BM",
    mark: 70,
    maxMark: 100,
    status: "marked",
    ...overrides,
  };
}

describe("matchPupils", () => {
  it("matches by studentId + subjectCode", () => {
    const upsa = [entry()];
    const uasa = [entry({ mark: 80 })];
    const result = matchPupils(upsa, uasa);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]!.studentId).toBe("s1");
    expect(result.matched[0]!.upsa.mark).toBe(70);
    expect(result.matched[0]!.uasa.mark).toBe(80);
  });

  it("does not match different subjects", () => {
    const upsa = [entry({ subjectCode: "BM" })];
    const uasa = [entry({ subjectCode: "BI" })];
    const result = matchPupils(upsa, uasa);
    expect(result.matched).toHaveLength(0);
    expect(result.upsaOnly).toHaveLength(1);
    expect(result.uasaOnly).toHaveLength(1);
  });

  it("does not match different students", () => {
    const upsa = [entry({ studentId: "s1" })];
    const uasa = [entry({ studentId: "s2" })];
    const result = matchPupils(upsa, uasa);
    expect(result.matched).toHaveLength(0);
    expect(result.upsaOnly).toHaveLength(1);
    expect(result.uasaOnly).toHaveLength(1);
  });

  it("puts entries without studentId into unmatched", () => {
    const upsa = [entry({ studentId: null })];
    const uasa = [entry({ studentId: null })];
    const result = matchPupils(upsa, uasa);
    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(2);
  });

  it("detects class changes and preserves both class names", () => {
    const upsa = [entry({ className: "3 Bestari" })];
    const uasa = [entry({ className: "4 Angsana" })];
    const result = matchPupils(upsa, uasa);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]!.className).toBe("4 Angsana");
    expect(result.matched[0]!.previousClassName).toBe("3 Bestari");
  });

  it("does not set previousClassName when class is the same", () => {
    const upsa = [entry({ className: "4 Angsana" })];
    const uasa = [entry({ className: "4 Angsana" })];
    const result = matchPupils(upsa, uasa);
    expect(result.matched[0]!.previousClassName).toBeUndefined();
  });

  it("handles missing/absent entries as matched pairs (status preserved)", () => {
    const upsa = [entry({ status: "absent", mark: null })];
    const uasa = [entry({ mark: 80 })];
    const result = matchPupils(upsa, uasa);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]!.upsa.status).toBe("absent");
    expect(result.matched[0]!.uasa.status).toBe("marked");
  });
});

describe("flattenResults", () => {
  it("flattens class results into individual subject entries", () => {
    const classResults = [{
      className: "4 Angsana",
      students: [{
        studentId: "s1",
        name: "Ali",
        className: "4 Angsana",
        subjects: [
          { subjectCode: "BM", mark: 70, maxMark: 100, status: "marked" as const },
          { subjectCode: "BI", mark: 60, maxMark: 100, status: "marked" as const },
        ],
      }],
    }];
    const entries = flattenResults(classResults);
    expect(entries).toHaveLength(2);
    expect(entries[0]!.subjectCode).toBe("BM");
    expect(entries[1]!.subjectCode).toBe("BI");
  });

  it("canonicalizes subject codes", () => {
    const classResults = [{
      className: "4 Angsana",
      students: [{
        studentId: "s1",
        name: "Ali",
        className: "4 Angsana",
        subjects: [
          { subjectCode: "BAHASAMELAYU", mark: 70, maxMark: 100, status: "marked" as const },
        ],
      }],
    }];
    const entries = flattenResults(classResults);
    expect(entries[0]!.subjectCode).toBe("BM");
  });
});
