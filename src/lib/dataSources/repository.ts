import { randomUUID } from "node:crypto";
import { getDatabase, isDatabaseConfigured } from "@/lib/db/client";
import type { ActorContext } from "@/lib/auth/actor";
import type { DataContractFinding } from "@/lib/readiness/dataContracts";
import type {
  PublicWorkbookSource,
  WorkbookSource,
  WorkbookSourceType,
  WorkbookValidationResult,
} from "@/lib/dataSources/types";
import type { SchoolContext } from "@/lib/config/schools";
import { getDefaultAssessmentPeriod, getDefaultPbdPeriod } from "@/lib/config/periods";
import { decryptSpreadsheetId, encryptSpreadsheetId } from "@/lib/dataSources/encryption";

type SourceRow = Record<string, unknown>;

export class DataSourceDatabaseUnavailableError extends Error {
  constructor() {
    super("Database-backed data-source management is not configured.");
    this.name = "DataSourceDatabaseUnavailableError";
  }
}

function requireDatabase() {
  if (!isDatabaseConfigured()) throw new DataSourceDatabaseUnavailableError();
  return getDatabase();
}

function date(value: unknown) {
  return value ? new Date(String(value)) : null;
}

function sourceFromRow(row: SourceRow): WorkbookSource {
  return {
    id: String(row.id),
    schoolId: String(row.school_id),
    year: String(row.year),
    type: row.type as WorkbookSourceType,
    spreadsheetId: decryptSpreadsheetId(String(row.spreadsheet_id)),
    state: row.state as WorkbookSource["state"],
    readinessStatus: row.readiness_status as WorkbookSource["readinessStatus"],
    schemaVersion: row.schema_version ? String(row.schema_version) : null,
    fingerprint: row.fingerprint ? String(row.fingerprint) : null,
    findings: Array.isArray(row.findings_json) ? row.findings_json as DataContractFinding[] : [],
    lastCheckedAt: date(row.last_checked_at),
    lastSuccessfulReadAt: date(row.last_successful_read_at),
    createdBy: String(row.created_by),
    updatedBy: String(row.updated_by),
    createdAt: date(row.created_at) ?? new Date(0),
    updatedAt: date(row.updated_at) ?? new Date(0),
  };
}

export function toPublicWorkbookSource(source: WorkbookSource): PublicWorkbookSource {
  return {
    id: source.id,
    schoolId: source.schoolId,
    year: source.year,
    type: source.type,
    state: source.state,
    readinessStatus: source.readinessStatus,
    schemaVersion: source.schemaVersion,
    fingerprint: source.fingerprint,
    findings: source.findings,
    lastCheckedAt: source.lastCheckedAt,
    lastSuccessfulReadAt: source.lastSuccessfulReadAt,
    createdBy: source.createdBy,
    updatedBy: source.updatedBy,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

export async function listWorkbookSources(schoolId: string) {
  if (!isDatabaseConfigured()) return [];
  const sql = getDatabase();
  const rows = await sql`SELECT * FROM workbook_sources WHERE school_id = ${schoolId} ORDER BY year DESC, type, created_at DESC`;
  return rows.map(sourceFromRow);
}

export async function getWorkbookSource(schoolId: string, sourceId: string) {
  const sql = requireDatabase();
  const rows = await sql`SELECT * FROM workbook_sources WHERE school_id = ${schoolId} AND id = ${sourceId} LIMIT 1`;
  return rows[0] ? sourceFromRow(rows[0]) : null;
}

export async function createValidatedDraft(
  context: ActorContext,
  input: { year: string; type: WorkbookSourceType; spreadsheetId: string },
  validation: WorkbookValidationResult,
  requestId?: string,
) {
  const sql = requireDatabase();
  const id = randomUUID();
  const readinessId = randomUUID();
  const auditId = randomUUID();
  const warningCount = validation.findings.filter((item) => item.severity === "warning").length;
  const fatalCount = validation.findings.filter((item) => item.severity === "fatal").length;
  const now = new Date();
  const encryptedSpreadsheetId = encryptSpreadsheetId(input.spreadsheetId);
  const successfulRead = validation.status === "ready" || validation.status === "warning" ? now : null;
  await sql.transaction((txn) => [
    txn`INSERT INTO workbook_sources (
      id, school_id, year, type, spreadsheet_id, state, readiness_status, schema_version,
      fingerprint, findings_json, last_checked_at, last_successful_read_at, created_by, updated_by
    ) VALUES (
      ${id}, ${context.school.id}, ${input.year}, ${input.type}, ${encryptedSpreadsheetId}, 'draft',
      ${validation.status}, ${validation.schemaVersion}, ${validation.fingerprint}, ${JSON.stringify(validation.findings)}::jsonb,
      ${now}, ${successfulRead}, ${context.actor.id}, ${context.actor.id}
    )`,
    txn`INSERT INTO readiness_runs (
      id, school_id, workbook_source_id, status, fingerprint, warning_count, fatal_count, findings_json, checked_at
    ) VALUES (
      ${readinessId}, ${context.school.id}, ${id}, ${validation.status}, ${validation.fingerprint},
      ${warningCount}, ${fatalCount}, ${JSON.stringify(validation.findings)}::jsonb, ${now}
    )`,
    txn`INSERT INTO audit_events (
      id, school_id, actor_id, actor_role, action, resource_type, resource_id, outcome, metadata_json, request_id
    ) VALUES (
      ${auditId}, ${context.school.id}, ${context.actor.id}, ${context.actor.role}, 'workbook.validate',
      'workbook_source', ${id}, ${validation.status}, ${JSON.stringify({ year: input.year, type: input.type, warningCount, fatalCount })}::jsonb, ${requestId ?? null}
    )`,
  ]);
  return (await getWorkbookSource(context.school.id, id))!;
}

export async function updateSourceValidation(
  context: ActorContext,
  source: WorkbookSource,
  validation: WorkbookValidationResult,
  requestId?: string,
) {
  const sql = requireDatabase();
  const readinessId = randomUUID();
  const auditId = randomUUID();
  const warningCount = validation.findings.filter((item) => item.severity === "warning").length;
  const fatalCount = validation.findings.filter((item) => item.severity === "fatal").length;
  const now = new Date();
  const successfulRead = validation.status === "ready" || validation.status === "warning" ? now : source.lastSuccessfulReadAt;
  await sql.transaction((txn) => [
    txn`UPDATE workbook_sources SET
      readiness_status = ${validation.status}, schema_version = ${validation.schemaVersion},
      fingerprint = ${validation.fingerprint}, findings_json = ${JSON.stringify(validation.findings)}::jsonb,
      last_checked_at = ${now}, last_successful_read_at = ${successfulRead}, updated_by = ${context.actor.id}, updated_at = now()
      WHERE id = ${source.id} AND school_id = ${context.school.id}`,
    txn`INSERT INTO readiness_runs (
      id, school_id, workbook_source_id, status, fingerprint, warning_count, fatal_count, findings_json, checked_at
    ) VALUES (
      ${readinessId}, ${context.school.id}, ${source.id}, ${validation.status}, ${validation.fingerprint},
      ${warningCount}, ${fatalCount}, ${JSON.stringify(validation.findings)}::jsonb, ${now}
    )`,
    txn`INSERT INTO audit_events (
      id, school_id, actor_id, actor_role, action, resource_type, resource_id, outcome, metadata_json, request_id
    ) VALUES (
      ${auditId}, ${context.school.id}, ${context.actor.id}, ${context.actor.role}, 'workbook.recheck',
      'workbook_source', ${source.id}, ${validation.status}, ${JSON.stringify({ year: source.year, type: source.type, warningCount, fatalCount })}::jsonb, ${requestId ?? null}
    )`,
  ]);
  return (await getWorkbookSource(context.school.id, source.id))!;
}

export async function activateWorkbookSource(
  context: ActorContext,
  source: WorkbookSource,
  validation: WorkbookValidationResult,
  requestId?: string,
) {
  if (validation.status !== "ready" && validation.status !== "warning") {
    throw new Error("Only ready or warning workbook sources can be activated.");
  }
  const sql = requireDatabase();
  const auditId = randomUUID();
  const readinessId = randomUUID();
  const fingerprintId = validation.fingerprint ? randomUUID() : null;
  const warningCount = validation.findings.filter((item) => item.severity === "warning").length;
  const fatalCount = validation.findings.filter((item) => item.severity === "fatal").length;
  const now = new Date();
  const activeRows = await sql`SELECT id FROM workbook_sources WHERE school_id = ${context.school.id} AND year = ${source.year} AND type = ${source.type} AND state = 'active'`;
  const previousSourceId = activeRows[0]?.id ? String(activeRows[0].id) : null;
  await sql.transaction((txn) => [
    txn`UPDATE workbook_sources SET state = 'disabled', updated_by = ${context.actor.id}, updated_at = now()
      WHERE school_id = ${context.school.id} AND year = ${source.year} AND type = ${source.type} AND state = 'active'`,
    txn`UPDATE workbook_sources SET state = 'active', readiness_status = ${validation.status},
      schema_version = ${validation.schemaVersion}, fingerprint = ${validation.fingerprint},
      findings_json = ${JSON.stringify(validation.findings)}::jsonb, last_checked_at = ${now},
      last_successful_read_at = ${now}, updated_by = ${context.actor.id}, updated_at = now()
      WHERE id = ${source.id} AND school_id = ${context.school.id}`,
    txn`INSERT INTO readiness_runs (
      id, school_id, workbook_source_id, status, fingerprint, warning_count, fatal_count, findings_json, checked_at
    ) VALUES (
      ${readinessId}, ${context.school.id}, ${source.id}, ${validation.status}, ${validation.fingerprint},
      ${warningCount}, ${fatalCount}, ${JSON.stringify(validation.findings)}::jsonb, ${now}
    )`,
    ...(validation.fingerprint && fingerprintId ? [txn`INSERT INTO data_fingerprints (id, school_id, workbook_source_id, fingerprint)
      VALUES (${fingerprintId}, ${context.school.id}, ${source.id}, ${validation.fingerprint})`] : []),
    txn`INSERT INTO audit_events (
      id, school_id, actor_id, actor_role, action, resource_type, resource_id, outcome, metadata_json, request_id
    ) VALUES (
      ${auditId}, ${context.school.id}, ${context.actor.id}, ${context.actor.role}, 'workbook.activate',
      'workbook_source', ${source.id}, 'success', ${JSON.stringify({ year: source.year, type: source.type, previousSourceId, warningCount, fatalCount })}::jsonb, ${requestId ?? null}
    )`,
  ]);
  return (await getWorkbookSource(context.school.id, source.id))!;
}

export async function disableWorkbookSource(context: ActorContext, source: WorkbookSource, requestId?: string) {
  const sql = requireDatabase();
  await sql.transaction((txn) => [
    txn`UPDATE workbook_sources SET state = 'disabled', updated_by = ${context.actor.id}, updated_at = now()
      WHERE id = ${source.id} AND school_id = ${context.school.id}`,
    txn`INSERT INTO audit_events (
      id, school_id, actor_id, actor_role, action, resource_type, resource_id, outcome, metadata_json, request_id
    ) VALUES (
      ${randomUUID()}, ${context.school.id}, ${context.actor.id}, ${context.actor.role}, 'workbook.disable',
      'workbook_source', ${source.id}, 'success', ${JSON.stringify({ year: source.year, type: source.type })}::jsonb, ${requestId ?? null}
    )`,
  ]);
}

export async function applyActiveWorkbookSources(school: SchoolContext): Promise<SchoolContext> {
  if (!isDatabaseConfigured()) return school;
  const sources = (await listWorkbookSources(school.id)).filter((source) => source.state === "active");
  if (!sources.length) return school;
  const assessmentPeriods = school.assessmentPeriods.map((period) => {
    const source = sources.find((item) => item.year === period.year && item.type === period.assessment);
    return source ? { ...period, spreadsheetId: source.readinessStatus === "ready" || source.readinessStatus === "warning" ? source.spreadsheetId : "" } : period;
  });
  const pbdPeriods = school.pbdPeriods.map((period) => {
    const source = sources.find((item) => item.year === period.year && item.type === "pbd");
    return source ? { ...period, spreadsheetId: source.readinessStatus === "ready" || source.readinessStatus === "warning" ? source.spreadsheetId : "" } : period;
  });
  return {
    ...school,
    assessmentPeriods,
    pbdPeriods,
    defaultUpsaPeriod: getDefaultAssessmentPeriod(assessmentPeriods, "upsa"),
    defaultUasaPeriod: getDefaultAssessmentPeriod(assessmentPeriods, "uasa"),
    defaultPbdPeriod: getDefaultPbdPeriod(pbdPeriods),
  };
}
