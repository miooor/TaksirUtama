import { z } from "zod";
import { parseSchoolsConfig } from "@/lib/config/schools";

const envSchema = z.object({
  SCHOOLS_CONFIG: z.string().min(2),
  SESSION_SECRET: z.string().min(32),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.preprocess((value) => value === "" ? undefined : value, z.string().email().optional()),
  GOOGLE_PRIVATE_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  DATABASE_URL: z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional()),
  CLERK_SECRET_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  ALLOW_SHARED_DATA_SOURCE_ADMIN: z.preprocess((value) => value === "" ? undefined : value, z.enum(["true", "false"]).optional()),
  CRON_SECRET: z.preprocess((value) => value === "" ? undefined : value, z.string().min(16).optional()),
  WORKBOOK_ENCRYPTION_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(43).optional()),
  NEXT_PUBLIC_ASSESSMENT_TEMPLATE_URL: z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional()),
  NEXT_PUBLIC_PBD_TEMPLATE_URL: z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional()),
});

export const env = envSchema.parse(process.env);
export const schools = parseSchoolsConfig(env.SCHOOLS_CONFIG);
export const hasGoogleCredentials = Boolean(
  env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY,
);
export const hasDatabase = Boolean(env.DATABASE_URL);
export const hasClerk = Boolean(env.CLERK_SECRET_KEY && env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function getSchoolById(id: string) {
  return schools.find((school) => school.id === id) ?? null;
}

export function getSchoolByCode(code: string) {
  const normalized = code.trim().toLocaleLowerCase("en");
  return schools.find((school) => school.code.toLocaleLowerCase("en") === normalized) ?? null;
}
