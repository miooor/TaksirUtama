import { describe, expect, it } from "vitest";
import { toPercent, classifyMovement, MOVEMENT_THRESHOLD } from "./normalize";

describe("toPercent", () => {
  it("converts mark to percentage", () => {
    expect(toPercent(75, 100)).toBe(75);
    expect(toPercent(30, 60)).toBe(50);
    expect(toPercent(45, 50)).toBe(90);
  });

  it("returns null for null mark", () => {
    expect(toPercent(null, 100)).toBeNull();
  });

  it("returns null for zero maxMark", () => {
    expect(toPercent(50, 0)).toBeNull();
  });

  it("returns null for negative maxMark", () => {
    expect(toPercent(50, -10)).toBeNull();
  });

  it("returns null for non-finite mark", () => {
    expect(toPercent(Infinity, 100)).toBeNull();
    expect(toPercent(NaN, 100)).toBeNull();
  });

  it("handles different max marks for normalization", () => {
    // 40/50 = 80%, 80/100 = 80% — same percentage despite different raw marks
    expect(toPercent(40, 50)).toBe(80);
    expect(toPercent(80, 100)).toBe(80);
  });
});

describe("classifyMovement", () => {
  it("classifies improved at exactly +5", () => {
    expect(classifyMovement(MOVEMENT_THRESHOLD)).toBe("improved");
    expect(classifyMovement(5)).toBe("improved");
  });

  it("classifies declined at exactly -5", () => {
    expect(classifyMovement(-MOVEMENT_THRESHOLD)).toBe("declined");
    expect(classifyMovement(-5)).toBe("declined");
  });

  it("classifies stable between -5 and +5 exclusive", () => {
    expect(classifyMovement(4.9)).toBe("stable");
    expect(classifyMovement(-4.9)).toBe("stable");
    expect(classifyMovement(0)).toBe("stable");
    expect(classifyMovement(2.5)).toBe("stable");
    expect(classifyMovement(-2.5)).toBe("stable");
  });

  it("classifies incomplete for null delta", () => {
    expect(classifyMovement(null)).toBe("incomplete");
  });

  it("classifies large positive as improved", () => {
    expect(classifyMovement(20)).toBe("improved");
    expect(classifyMovement(100)).toBe("improved");
  });

  it("classifies large negative as declined", () => {
    expect(classifyMovement(-20)).toBe("declined");
    expect(classifyMovement(-100)).toBe("declined");
  });
});
