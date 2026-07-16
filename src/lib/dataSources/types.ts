import type { DataContractFinding } from "@/lib/readiness/dataContracts";

export type WorkbookSourceType = "upsa" | "uasa" | "pbd";
export type WorkbookSourceState = "draft" | "active" | "disabled";
export type WorkbookReadinessStatus = "checking" | "ready" | "warning" | "fatal" | "inaccessible";

export type WorkbookSource = {
  id: string;
  schoolId: string;
  year: string;
  type: WorkbookSourceType;
  spreadsheetId: string;
  state: WorkbookSourceState;
  readinessStatus: WorkbookReadinessStatus;
  schemaVersion: string | null;
  fingerprint: string | null;
  findings: DataContractFinding[];
  lastCheckedAt: Date | null;
  lastSuccessfulReadAt: Date | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicWorkbookSource = Omit<WorkbookSource, "spreadsheetId">;

export type WorkbookValidationResult = {
  status: Exclude<WorkbookReadinessStatus, "checking">;
  schemaVersion: string | null;
  fingerprint: string | null;
  findings: DataContractFinding[];
};
