import { describe, expect, it } from "vitest";
import { toDistribution, classifyPbdDirection, buildPbdSemesterMovements, type PbdRecordInput } from "./pbdSemesterMovement";

function record(overrides: Partial<PbdRecordInput> = {}): PbdRecordInput {
  return {
    className: "4 Angsana",
    subjectCode: "BM",
    tpCounts: { TP1: 2, TP2: 3, TP3: 10, TP4: 8, TP5: 5, TP6: 2 },
    totalPupils: 30,
    notAssessedCount: 0,
    ...overrides,
  };
}

describe("toDistribution", () => {
  it("calculates low/mid/high percentages", () => {
    const dist = toDistribution(record());
    // low = (2+3)/30 = 16.67%, mid = (10+8)/30 = 60%, high = (5+2)/30 = 23.33%
    expect(dist.low).toBeCloseTo(16.67, 1);
    expect(dist.mid).toBeCloseTo(60, 1);
    expect(dist.high).toBeCloseTo(23.33, 1);
    expect(dist.total).toBe(30);
    expect(dist.notAssessed).toBe(0);
  });

  it("excludes notAssessed from denominator", () => {
    const dist = toDistribution(record({ totalPupils: 30, notAssessedCount: 5 }));
    // assessed = 25, low = 5/25 = 20%, high = 7/25 = 28%
    expect(dist.low).toBeCloseTo(20, 1);
    expect(dist.high).toBeCloseTo(28, 1);
  });
});

describe("classifyPbdDirection", () => {
  it("returns incomplete for null deltas", () => {
    expect(classifyPbdDirection(null, null)).toBe("incomplete");
    expect(classifyPbdDirection(5, null)).toBe("incomplete");
    expect(classifyPbdDirection(null, 5)).toBe("incomplete");
  });

  it("classifies improved when high mastery increases >= 5", () => {
    expect(classifyPbdDirection(-2, 6)).toBe("improved");
    expect(classifyPbdDirection(0, 5)).toBe("improved");
  });

  it("classifies declined when high mastery decreases >= 5", () => {
    expect(classifyPbdDirection(2, -6)).toBe("declined");
    expect(classifyPbdDirection(0, -5)).toBe("declined");
  });

  it("uses low delta as secondary signal", () => {
    // high delta small, but low mastery decreased significantly
    expect(classifyPbdDirection(-6, 2)).toBe("improved");
    // high delta small, but low mastery increased significantly
    expect(classifyPbdDirection(6, -2)).toBe("declined");
  });

  it("classifies stable when both deltas are small", () => {
    expect(classifyPbdDirection(2, 2)).toBe("stable");
    expect(classifyPbdDirection(-3, 3)).toBe("stable");
  });
});

describe("buildPbdSemesterMovements", () => {
  it("compares matching class-subject pairs across semesters", () => {
    const sem1 = [record({ tpCounts: { TP1: 5, TP2: 5, TP3: 10, TP4: 5, TP5: 3, TP6: 2 } })];
    const sem2 = [record({ tpCounts: { TP1: 2, TP2: 2, TP3: 10, TP4: 8, TP5: 5, TP6: 3 } })];
    const result = buildPbdSemesterMovements(sem1, sem2);
    expect(result).toHaveLength(1);
    expect(result[0]!.sem1).not.toBeNull();
    expect(result[0]!.sem2).not.toBeNull();
    expect(result[0]!.lowDelta).not.toBeNull();
    expect(result[0]!.highDelta).not.toBeNull();
  });

  it("marks missing semester as incomplete", () => {
    const sem1 = [record()];
    const result = buildPbdSemesterMovements(sem1, []);
    expect(result).toHaveLength(1);
    expect(result[0]!.sem2).toBeNull();
    expect(result[0]!.direction).toBe("incomplete");
  });

  it("handles new class-subject in sem2 only", () => {
    const sem2 = [record()];
    const result = buildPbdSemesterMovements([], sem2);
    expect(result).toHaveLength(1);
    expect(result[0]!.sem1).toBeNull();
    expect(result[0]!.direction).toBe("incomplete");
  });

  it("produces union of all class-subject keys", () => {
    const sem1 = [record({ className: "4 Angsana", subjectCode: "BM" })];
    const sem2 = [
      record({ className: "4 Angsana", subjectCode: "BM" }),
      record({ className: "5 Bestari", subjectCode: "BI" }),
    ];
    const result = buildPbdSemesterMovements(sem1, sem2);
    expect(result).toHaveLength(2);
  });
});
