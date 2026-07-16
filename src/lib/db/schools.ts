import { getDatabase, isDatabaseConfigured } from "@/lib/db/client";
import { schools as environmentSchools } from "@/lib/config/env";
import { parseSchoolsConfig, type SchoolContext } from "@/lib/config/schools";

function parseDatabaseSchool(config: unknown) {
  return parseSchoolsConfig(JSON.stringify([config]))[0] ?? null;
}

export async function getSchoolByClerkOrganizationId(organizationId: string): Promise<SchoolContext | null> {
  if (isDatabaseConfigured()) {
    const sql = getDatabase();
    const rows = await sql`SELECT config_json FROM schools WHERE clerk_organization_id = ${organizationId} AND status = 'active' LIMIT 1`;
    if (rows[0]?.config_json) return parseDatabaseSchool(rows[0].config_json);
  }
  return environmentSchools.find((school) => school.clerkOrganizationId === organizationId) ?? null;
}
