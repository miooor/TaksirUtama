import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("PBD subject workflow migration", () => {
  it("qualifies the period status column so it cannot collide with the function output", () => {
    const source = readFileSync(resolve(process.cwd(), "database/005_pbd_subject_workflow.sql"), "utf8");
    expect(source).toContain("database_pbd_periods.status IN ('draft', 'open')");
    expect(source).not.toContain("school_id = p_school_id AND status IN");
  });

  it("includes an upgrade migration for databases that already installed the workflow", () => {
    const source = readFileSync(resolve(process.cwd(), "database/006_fix_pbd_subject_period_status.sql"), "utf8");
    expect(source).toContain("pg_get_functiondef");
    expect(source).toContain("database_pbd_periods.status IN");
  });
});
