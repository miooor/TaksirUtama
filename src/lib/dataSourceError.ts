export type DataSourceIssueCode = "credentials_missing" | "workbook_inaccessible" | "sheet_missing" | "schema_invalid" | "database_required";

export class DataSourceError extends Error {
  constructor(
    public readonly code: DataSourceIssueCode,
    message: string,
    public readonly source: "upsa" | "uasa" | "pbd",
  ) {
    super(message);
    this.name = "DataSourceError";
  }
}
