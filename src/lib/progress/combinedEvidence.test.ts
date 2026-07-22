import { describe, expect, it } from "vitest";
import { classifyEvidence } from "./combinedEvidence";
import type { AggregateMovement, PbdSemesterMovement } from "@/types/progress";

function exam(overrides: Partial<AggregateMovement> = {}): AggregateMovement {
  return {
    label: "4 Angsana|BM",
    matchedCount: 20,
    improvedCount: 10,
    stableCount: 7,
    declinedCount: 3,
    averageDelta: 6,
    upsaAveragePercent: 65,
    uasaAveragePercent: 71,
    coverageRatio: 0.8,
    ...overrides,
  };
}

function pbd(direction: PbdSemesterMovement["direction"]): PbdSemesterMovement {
  return {
    className: "4 Angsana",
    subjectCode: "BM",
    sem1: { low: 20, mid: 50, high: 30, notAssessed: 0, total: 30 },
    sem2: { low: 15, mid: 50, high: 35, notAssessed: 0, total: 30 },
    lowDelta: -5,
    highDelta: 5,
    direction,
  };
}

describe("classifyEvidence", () => {
  it("returns incomplete when coverage < 50%", () => {
    expect(classifyEvidence(exam(), pbd("improved"), 0.3)).toBe("incomplete");
    expect(classifyEvidence(exam(), pbd("improved"), 0.49)).toBe("incomplete");
  });

  it("returns improving when both exam and PBD improve", () => {
    expect(classifyEvidence(exam({ averageDelta: 8 }), pbd("improved"), 0.9)).toBe("improving");
  });

  it("returns declining when both exam and PBD decline", () => {
    expect(classifyEvidence(exam({ averageDelta: -8, improvedCount: 2, declinedCount: 12 }), pbd("declined"), 0.9)).toBe("declining");
  });

  it("returns mixed when exam improves but PBD declines", () => {
    expect(classifyEvidence(exam({ averageDelta: 8 }), pbd("declined"), 0.9)).toBe("mixed");
  });

  it("returns mixed when exam declines but PBD improves", () => {
    expect(classifyEvidence(exam({ averageDelta: -8, improvedCount: 2, declinedCount: 12 }), pbd("improved"), 0.9)).toBe("mixed");
  });

  it("returns stable when both are stable", () => {
    expect(classifyEvidence(exam({ averageDelta: 1, improvedCount: 5, declinedCount: 4 }), pbd("stable"), 0.9)).toBe("stable");
  });

  it("uses exam only when PBD is null", () => {
    expect(classifyEvidence(exam({ averageDelta: 8 }), null, 0.9)).toBe("improving");
    expect(classifyEvidence(exam({ averageDelta: -8, improvedCount: 2, declinedCount: 12 }), null, 0.9)).toBe("declining");
  });

  it("uses PBD only when exam is null", () => {
    expect(classifyEvidence(null, pbd("improved"), 0.9)).toBe("improving");
    expect(classifyEvidence(null, pbd("declined"), 0.9)).toBe("declining");
  });

  it("returns incomplete when both are null", () => {
    expect(classifyEvidence(null, null, 0.9)).toBe("incomplete");
  });

  it("returns incomplete when PBD direction is incomplete", () => {
    expect(classifyEvidence(null, pbd("incomplete"), 0.9)).toBe("incomplete");
  });

  it("returns improving when exam improves and PBD is stable", () => {
    expect(classifyEvidence(exam({ averageDelta: 8 }), pbd("stable"), 0.9)).toBe("improving");
  });

  it("returns declining when exam declines and PBD is stable", () => {
    expect(classifyEvidence(exam({ averageDelta: -8, improvedCount: 2, declinedCount: 12 }), pbd("stable"), 0.9)).toBe("declining");
  });
});
