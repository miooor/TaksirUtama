import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let database: NeonQueryFunction<false, false> | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  if (!database) database = neon(process.env.DATABASE_URL);
  return database;
}
