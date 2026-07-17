import { z } from "zod";

export type AssessmentType = "upsa" | "uasa";

export type AssessmentPeriod = {
  year: string;
  assessment: AssessmentType;
  spreadsheetId: string;
  examName: string;
  slipTitle: string;
  enabled: boolean;
  default: boolean;
  availableFrom?: string;
  placeholder?: boolean;
};

export type PbdPeriod = {
  year: string;
  semester?: "1" | "2";
  spreadsheetId: string;
  reportName: string;
  enabled: boolean;
  default: boolean;
  placeholder?: boolean;
};

const assessmentPeriodSchema = z.object({
  year: z.string().regex(/^\d{4}$/),
  assessment: z.enum(["upsa", "uasa"]),
  spreadsheetId: z.string().default(""),
  examName: z.string().min(1),
  slipTitle: z.string().min(1),
  enabled: z.boolean().default(true),
  default: z.boolean().default(false),
  availableFrom: z.string().datetime({ offset: true }).optional(),
});

const pbdPeriodSchema = z.object({
  year: z.string().regex(/^\d{4}$/),
  semester: z.enum(["1", "2"]).optional(),
  spreadsheetId: z.string().default(""),
  reportName: z.string().min(1),
  enabled: z.boolean().default(true),
  default: z.boolean().default(false),
});

function parseJsonArray(value: string, name: string) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      throw new Error(`${name} must be a JSON array.`);
    }
    return parsed;
  } catch (error) {
    throw new Error(`${name} is not valid JSON: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

function ensureSingleDefault<T extends { default: boolean; enabled: boolean }>(periods: T[], name: string) {
  const enabled = periods.filter((period) => period.enabled);
  const defaults = enabled.filter((period) => period.default);
  if (enabled.length === 0) {
    throw new Error(`${name} must include at least one enabled period.`);
  }
  if (defaults.length !== 1) {
    throw new Error(`${name} must include exactly one enabled default period.`);
  }
}

export function parseAssessmentPeriods(value: string): AssessmentPeriod[] {
  const periods = z.array(assessmentPeriodSchema).parse(parseJsonArray(value, "ASSESSMENT_PERIODS"));
  for (const assessment of ["upsa", "uasa"] as const) {
    const family = periods.filter((period) => period.assessment === assessment);
    if (family.some((period) => period.enabled)) {
      ensureSingleDefault(family, `ASSESSMENT_PERIODS (${assessment.toUpperCase()})`);
    }
  }
  const keys = new Set<string>();
  for (const period of periods) {
    const key = `${period.year}:${period.assessment}`;
    if (keys.has(key)) {
      throw new Error(`ASSESSMENT_PERIODS contains duplicate period ${key}.`);
    }
    keys.add(key);
  }
  return periods;
}

export function parsePbdPeriods(value: string): PbdPeriod[] {
  const periods = z.array(pbdPeriodSchema).parse(parseJsonArray(value, "PBD_PERIODS"));
  ensureSingleDefault(periods, "PBD_PERIODS");
  const keys = new Set<string>();
  for (const period of periods) {
    const key = `${period.year}:${period.semester ?? ""}`;
    if (keys.has(key)) {
      throw new Error(`PBD_PERIODS contains duplicate year${period.semester ? ` semester ${period.semester}` : ""}: ${period.year}.`);
    }
    keys.add(key);
  }
  return periods;
}

export function getDefaultAssessmentPeriod(periods: AssessmentPeriod[], assessment?: AssessmentType) {
  const matching = assessment ? periods.filter((period) => period.enabled && period.assessment === assessment) : periods.filter((period) => period.enabled);
  return matching.find((period) => period.default) ?? matching[0] ?? null;
}

export function resolveAssessmentPeriod(periods: AssessmentPeriod[], year: string, assessment: string) {
  return periods.find((period) => period.enabled && period.year === year && period.assessment === assessment) ?? null;
}

export function resolveAssessmentPeriodKey(periods: AssessmentPeriod[], key: string) {
  const [year, assessment] = key.split(":");
  return year && assessment ? resolveAssessmentPeriod(periods, year, assessment) : null;
}

export function getDefaultPbdPeriod(periods: PbdPeriod[]) {
  return periods.find((period) => period.enabled && period.default) ?? periods.find((period) => period.enabled) ?? null;
}

export function resolvePbdPeriod(periods: PbdPeriod[], year: string) {
  return periods.find((period) => period.enabled && period.year === year) ?? null;
}

export function listPeriodYears(assessmentPeriods: AssessmentPeriod[], pbdPeriods: PbdPeriod[]) {
  return [...new Set([...assessmentPeriods, ...pbdPeriods].filter((period) => period.enabled).map((period) => period.year))].sort((a, b) => a.localeCompare(b));
}

export function createPlaceholderAssessmentPeriod(year: string, assessment: AssessmentType): AssessmentPeriod {
  const label = assessment.toUpperCase();
  return {
    year,
    assessment,
    spreadsheetId: "",
    examName: `${label} ${year}`,
    slipTitle: `${label} ${year}`,
    enabled: true,
    default: false,
    placeholder: true,
  };
}

export function createPlaceholderPbdPeriod(year: string): PbdPeriod {
  return {
    year,
    spreadsheetId: "",
    reportName: `PBD ${year}`,
    enabled: true,
    default: false,
    placeholder: true,
  };
}

export function assessmentPath(period: AssessmentPeriod, suffix = "") {
  return `/assessments/${period.year}/${period.assessment}${suffix}`;
}

export function assessmentLabel(period: Pick<AssessmentPeriod, "assessment">) {
  return period.assessment.toUpperCase();
}
