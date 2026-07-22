import { describe, expect, it } from "vitest";
import { aggregateMovements, aggregateSchool } from "./aggregateMovement";
import type { PupilMovement } from "@/types/progress";

function movement(overrides: Partial<PupilMovement> = {}): PupilMovement {
  return {
    studentId: "s1",
    displayName: "Ali",
    className: "4 Angsana",
    subjectCode: "BM",
    upsaMark: 70,
    upsaMaxMark: 100,
    uasaMark: 80,
    uasaMaxMark: 100,
    upsaPercent: 70,
    uasaPercent: 80,
    delta: 10,
    direction: "improved",
    ...overrides,
  };
}

describe("aggregateMovements", () => {
  it("groups by key and counts directions", () => {
    const movements = [
      movement({ studentId: "s1", delta: 10, direction: "improved" }),
      movement({ studentId: "s2", delta: -8, direction: "declined" }),
      movement({ studentId: "s3", delta: 2, direction: "stable" }),
    ];
    const result = aggregateMovements(movements, () => "4 Angsana");
    expect(result).toHaveLength(1);
    expect(result[0]!.label).toBe("4 Angsana");
    expect(result[0]!.matchedCount).toBe(3);
    expect(result[0]!.improvedCount).toBe(1);
    expect(result[0]!.declinedCount).toBe(1);
    expect(result[0]!.stableCount).toBe(1);
  });

  it("calculates average delta", () => {
    const movements = [
      movement({ delta: 10 }),
      movement({ studentId: "s2", delta: -4 }),
    ];
    const result = aggregateMovements(movements, () => "all");
    expect(result[0]!.averageDelta).toBe(3); // (10 + -4) / 2
  });

  it("excludes incomplete movements from counts", () => {
    const movements = [
      movement({ delta: 10, direction: "improved" }),
      movement({ studentId: "s2", delta: null, direction: "incomplete", upsaPercent: null, uasaPercent: 80 }),
    ];
    const result = aggregateMovements(movements, () => "all");
    expect(result[0]!.matchedCount).toBe(1);
    expect(result[0]!.improvedCount).toBe(1);
  });

  it("splits into multiple groups by key", () => {
    const movements = [
      movement({ className: "4 Angsana" }),
      movement({ studentId: "s2", className: "5 Bestari" }),
    ];
    const result = aggregateMovements(movements, (m) => m.className);
    expect(result).toHaveLength(2);
  });

  it("calculates coverage ratio with totalEnrolledByKey", () => {
    const movements = [movement({ delta: 10 })];
    const enrolled = new Map([["4 Angsana", 4]]);
    const result = aggregateMovements(movements, () => "4 Angsana", enrolled);
    expect(result[0]!.coverageRatio).toBe(0.25); // 1 matched / 4 enrolled
  });
});

describe("aggregateSchool", () => {
  it("returns null for empty movements", () => {
    expect(aggregateSchool([], 0)).toBeNull();
  });

  it("computes school-wide aggregate", () => {
    const movements = [
      movement({ delta: 10, direction: "improved" }),
      movement({ studentId: "s2", delta: -6, direction: "declined" }),
    ];
    const result = aggregateSchool(movements, 10);
    expect(result!.label).toBe("school");
    expect(result!.matchedCount).toBe(2);
    expect(result!.improvedCount).toBe(1);
    expect(result!.declinedCount).toBe(1);
    expect(result!.coverageRatio).toBe(0.2); // 2/10
  });
});
