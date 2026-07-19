import { describe, expect, it } from "vitest";
import { calculateInterventionCoverage } from "@/lib/pbd/interventionWorkflow";

describe("intervention coverage", () => {
  it("reports unavailable coverage before Rumusan is final", () => {
    expect(calculateInterventionCoverage(1, null, [{ tp: 1, active: true }])).toMatchObject({ recorded: 1, status: "unavailable" });
  });

  it("reports missing, complete, and excess independently", () => {
    const records = [{ tp: 1 as const, active: true }, { tp: 1 as const, active: true }];
    expect(calculateInterventionCoverage(1, 3, records).status).toBe("missing");
    expect(calculateInterventionCoverage(1, 2, records).status).toBe("complete");
    expect(calculateInterventionCoverage(1, 1, records).status).toBe("excess");
  });
});
