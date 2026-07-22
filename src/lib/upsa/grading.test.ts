import { describe, expect, it } from "vitest";
import { gradeFromMark } from "@/lib/upsa/grading";

describe("gradeFromMark", () => {
  it("maps marks to the fixed UPSA/UASA grading scale (boundary inclusive)", () => {
    // A: 82-100
    expect(gradeFromMark(100)).toBe("A");
    expect(gradeFromMark(82)).toBe("A");
    // B: 66-81
    expect(gradeFromMark(81)).toBe("B");
    expect(gradeFromMark(66)).toBe("B");
    // C: 50-65
    expect(gradeFromMark(65)).toBe("C");
    expect(gradeFromMark(50)).toBe("C");
    // D: 35-49
    expect(gradeFromMark(49)).toBe("D");
    expect(gradeFromMark(35)).toBe("D");
    // E: 20-34
    expect(gradeFromMark(34)).toBe("E");
    expect(gradeFromMark(20)).toBe("E");
    // F: 0-19
    expect(gradeFromMark(19)).toBe("F");
    expect(gradeFromMark(0)).toBe("F");
  });
});
