import { describe, expect, it } from "vitest";
import { buildPupilMovements } from "./pupilMovement";
import type { MatchedPair } from "./matchPupils";

function pair(overrides: Partial<MatchedPair> = {}): MatchedPair {
  return {
    studentId: "s1",
    displayName: "Ali",
    className: "4 Angsana",
    subjectCode: "BM",
    upsa: { studentId: "s1", displayName: "Ali", className: "4 Angsana", subjectCode: "BM", mark: 70, maxMark: 100, status: "marked" },
    uasa: { studentId: "s1", displayName: "Ali", className: "4 Angsana", subjectCode: "BM", mark: 80, maxMark: 100, status: "marked" },
    ...overrides,
  };
}

describe("buildPupilMovements", () => {
  it("calculates delta and direction for marked pairs", () => {
    const movements = buildPupilMovements([pair()]);
    expect(movements).toHaveLength(1);
    expect(movements[0]!.upsaPercent).toBe(70);
    expect(movements[0]!.uasaPercent).toBe(80);
    expect(movements[0]!.delta).toBe(10);
    expect(movements[0]!.direction).toBe("improved");
  });

  it("classifies declined correctly", () => {
    const movements = buildPupilMovements([pair({
      upsa: { studentId: "s1", displayName: "Ali", className: "4 Angsana", subjectCode: "BM", mark: 80, maxMark: 100, status: "marked" },
      uasa: { studentId: "s1", displayName: "Ali", className: "4 Angsana", subjectCode: "BM", mark: 70, maxMark: 100, status: "marked" },
    })]);
    expect(movements[0]!.delta).toBe(-10);
    expect(movements[0]!.direction).toBe("declined");
  });

  it("classifies stable for small changes", () => {
    const movements = buildPupilMovements([pair({
      upsa: { studentId: "s1", displayName: "Ali", className: "4 Angsana", subjectCode: "BM", mark: 70, maxMark: 100, status: "marked" },
      uasa: { studentId: "s1", displayName: "Ali", className: "4 Angsana", subjectCode: "BM", mark: 72, maxMark: 100, status: "marked" },
    })]);
    expect(movements[0]!.delta).toBe(2);
    expect(movements[0]!.direction).toBe("stable");
  });

  it("returns incomplete when UPSA is absent", () => {
    const movements = buildPupilMovements([pair({
      upsa: { studentId: "s1", displayName: "Ali", className: "4 Angsana", subjectCode: "BM", mark: null, maxMark: 100, status: "absent" },
    })]);
    expect(movements[0]!.upsaPercent).toBeNull();
    expect(movements[0]!.delta).toBeNull();
    expect(movements[0]!.direction).toBe("incomplete");
  });

  it("returns incomplete when UASA is missing", () => {
    const movements = buildPupilMovements([pair({
      uasa: { studentId: "s1", displayName: "Ali", className: "4 Angsana", subjectCode: "BM", mark: null, maxMark: 100, status: "missing" },
    })]);
    expect(movements[0]!.uasaPercent).toBeNull();
    expect(movements[0]!.delta).toBeNull();
    expect(movements[0]!.direction).toBe("incomplete");
  });

  it("normalizes different max marks before comparing", () => {
    const movements = buildPupilMovements([pair({
      upsa: { studentId: "s1", displayName: "Ali", className: "4 Angsana", subjectCode: "BM", mark: 35, maxMark: 50, status: "marked" },
      uasa: { studentId: "s1", displayName: "Ali", className: "4 Angsana", subjectCode: "BM", mark: 80, maxMark: 100, status: "marked" },
    })]);
    // 35/50 = 70%, 80/100 = 80%, delta = +10
    expect(movements[0]!.upsaPercent).toBe(70);
    expect(movements[0]!.uasaPercent).toBe(80);
    expect(movements[0]!.delta).toBe(10);
    expect(movements[0]!.direction).toBe("improved");
  });

  it("preserves class change information", () => {
    const movements = buildPupilMovements([pair({
      className: "4 Angsana",
      previousClassName: "3 Bestari",
    })]);
    expect(movements[0]!.className).toBe("4 Angsana");
    expect(movements[0]!.previousClassName).toBe("3 Bestari");
  });
});
