import { neon } from "@neondatabase/serverless";
import { createCipheriv, randomBytes } from "node:crypto";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (!process.env.SCHOOLS_CONFIG) throw new Error("SCHOOLS_CONFIG is required.");
if (!process.env.WORKBOOK_ENCRYPTION_KEY) throw new Error("WORKBOOK_ENCRYPTION_KEY is required.");
const schools = JSON.parse(process.env.SCHOOLS_CONFIG);
if (!Array.isArray(schools) || !schools.length) throw new Error("SCHOOLS_CONFIG must contain schools.");
const sql = neon(process.env.DATABASE_URL);
const encryptionKey = Buffer.from(process.env.WORKBOOK_ENCRYPTION_KEY, "base64url");
if (encryptionKey.length !== 32) throw new Error("WORKBOOK_ENCRYPTION_KEY must decode to exactly 32 bytes.");

function encrypt(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["enc:v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(":");
}

for (const school of schools) {
  const sources = [
    ...(school.assessmentPeriods ?? []).map((period) => ({ year: period.year, type: period.assessment, spreadsheetId: period.spreadsheetId })),
    ...(school.pbdPeriods ?? []).map((period) => ({ year: period.year, type: "pbd", spreadsheetId: period.spreadsheetId })),
  ].filter((source) => source.spreadsheetId);
  const config = {
    ...school,
    assessmentPeriods: (school.assessmentPeriods ?? []).map((period) => ({ ...period, spreadsheetId: "" })),
    pbdPeriods: (school.pbdPeriods ?? []).map((period) => ({ ...period, spreadsheetId: "" })),
  };
  await sql`
    INSERT INTO schools (id, code, slug, name, clerk_organization_id, config_json)
    VALUES (${school.id}, ${school.code}, ${school.slug}, ${school.name}, ${school.clerkOrganizationId ?? null}, ${JSON.stringify(config)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      code = EXCLUDED.code,
      slug = EXCLUDED.slug,
      name = EXCLUDED.name,
      clerk_organization_id = EXCLUDED.clerk_organization_id,
      config_json = EXCLUDED.config_json,
      updated_at = now()
  `;
  for (const source of sources) {
    const id = `launch-${school.id}-${source.year}-${source.type}`;
    await sql`
      INSERT INTO workbook_sources (
        id, school_id, year, type, spreadsheet_id, state, readiness_status, created_by, updated_by
      ) VALUES (
        ${id}, ${school.id}, ${source.year}, ${source.type}, ${encrypt(source.spreadsheetId)}, 'active', 'checking', 'system:migration', 'system:migration'
      )
      ON CONFLICT (id) DO UPDATE SET spreadsheet_id = EXCLUDED.spreadsheet_id, updated_at = now()
    `;
  }
}
process.stdout.write(`Imported ${schools.length} school configuration(s).\n`);
