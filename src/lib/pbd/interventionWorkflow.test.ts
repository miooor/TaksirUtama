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

  it("counts records with lifecycle fields correctly", () => {
    const records = [
      { tp: 1 as const, active: true, workflowStatus: "in_progress" as const, reviewDueOn: "2026-07-20" },
      { tp: 1 as const, active: true, workflowStatus: "completed" as const, reviewDueOn: "2026-07-18", followUpNote: "Done" },
      { tp: 2 as const, active: true, workflowStatus: "planned" as const },
    ];
    expect(calculateInterventionCoverage(1, 2, records)).toMatchObject({ recorded: 2, status: "complete" });
    expect(calculateInterventionCoverage(2, 1, records)).toMatchObject({ recorded: 1, status: "complete" });
  });

  it("excludes archived records from coverage count", () => {
    const records = [
      { tp: 1 as const, active: true, workflowStatus: "in_progress" as const },
      { tp: 1 as const, active: false, workflowStatus: "planned" as const },
    ];
    expect(calculateInterventionCoverage(1, 1, records)).toMatchObject({ recorded: 1, status: "complete" });
  });
});
