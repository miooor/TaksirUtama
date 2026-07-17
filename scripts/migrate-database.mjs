import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const here = dirname(fileURLToPath(import.meta.url));
const sql = neon(process.env.DATABASE_URL);
const databaseDir = resolve(here, "../database");
const files = (await readdir(databaseDir)).filter((file) => /^\d+_.+\.sql$/.test(file)).sort();

for (const file of files) {
  const statements = (await readFile(resolve(databaseDir, file), "utf8"))
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await sql.query(statement);
  }
  process.stdout.write(`Applied ${file}\n`);
}
