import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const here = dirname(fileURLToPath(import.meta.url));
const sqlText = await readFile(resolve(here, "../database/001_initial.sql"), "utf8");
const sql = neon(process.env.DATABASE_URL);
await sql.query(sqlText);
process.stdout.write("Database migration completed.\n");
