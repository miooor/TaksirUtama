import { z } from "zod";
import {
  getDefaultAssessmentPeriod,
  getDefaultPbdPeriod,
  parseAssessmentPeriods,
  parsePbdPeriods,
  type AssessmentPeriod,
  type PbdPeriod,
} from "@/lib/config/periods";

const headteacherSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
});

const rawSchoolSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/),
  code: z.string().min(2).max(32),
  slug: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(2),
  systemName: z.string().min(2).default("Analisa Kurikulum"),
  logoPath: z.string().startsWith("/"),
  letterheadPath: z.string().startsWith("/"),
  headteacher: headteacherSchema,
  locale: z.enum(["ms", "en"]).default("ms"),
  timezone: z.string().min(1).default("Asia/Kuala_Lumpur"),
  clerkOrganizationId: z.string().min(1).optional(),
  passwordHash: z.string().regex(/^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/),
  assessmentPeriods: z.array(z.unknown()),
  pbdPeriods: z.array(z.unknown()),
});

export type SchoolPublicProfile = {
  id: string;
  code: string;
  slug: string;
  name: string;
  systemName: string;
  logoPath: string;
  letterheadPath: string;
  headteacher: { name: string; title: string };
  locale: "ms" | "en";
  timezone: string;
};

export type SchoolContext = SchoolPublicProfile & {
  clerkOrganizationId?: string;
  passwordHash: string;
  assessmentPeriods: AssessmentPeriod[];
  pbdPeriods: PbdPeriod[];
  defaultUpsaPeriod: AssessmentPeriod | null;
  defaultUasaPeriod: AssessmentPeriod | null;
  defaultPbdPeriod: PbdPeriod | null;
};

function parseSchool(raw: unknown): SchoolContext {
  const parsed = rawSchoolSchema.parse(raw);
  const assessmentPeriods = parseAssessmentPeriods(JSON.stringify(parsed.assessmentPeriods));
  const pbdPeriods = parsePbdPeriods(JSON.stringify(parsed.pbdPeriods));
  return {
    ...parsed,
    assessmentPeriods,
    pbdPeriods,
    defaultUpsaPeriod: getDefaultAssessmentPeriod(assessmentPeriods, "upsa"),
    defaultUasaPeriod: getDefaultAssessmentPeriod(assessmentPeriods, "uasa"),
    defaultPbdPeriod: getDefaultPbdPeriod(pbdPeriods),
  };
}

export function parseSchoolsConfig(value: string): SchoolContext[] {
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch (error) {
    throw new Error(`SCHOOLS_CONFIG is not valid JSON: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("SCHOOLS_CONFIG must contain at least one school.");
  }
  const schools = raw.map(parseSchool);
  for (const field of ["id", "code", "slug"] as const) {
    const seen = new Set<string>();
    for (const school of schools) {
      const valueToCheck = school[field].toLocaleLowerCase("en");
      if (seen.has(valueToCheck)) {
        throw new Error(`SCHOOLS_CONFIG contains duplicate ${field}: ${school[field]}`);
      }
      seen.add(valueToCheck);
    }
  }
  return schools;
}

export function toSchoolPublicProfile(school: SchoolContext): SchoolPublicProfile {
  return {
    id: school.id,
    code: school.code,
    slug: school.slug,
    name: school.name,
    systemName: school.systemName,
    logoPath: school.logoPath,
    letterheadPath: school.letterheadPath,
    headteacher: school.headteacher,
    locale: school.locale,
    timezone: school.timezone,
  };
}
