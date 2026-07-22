// Local dev launcher that injects SCHOOLS_CONFIG directly into process.env.
//
// Why this exists: the SCHOOLS_CONFIG value contains scrypt password hashes with
// literal `$` characters (e.g. `scrypt$16384$8$1$salt$hash`). Next.js loads
// `.env.local` through dotenv + dotenv-expand, which interprets `$` as a variable
// reference and mangles the hashes, causing a ZodError on `passwordHash` at
// startup. Setting the value in process.env bypasses dotenv entirely
// (process.env takes precedence over .env files).
//
// The config is read from `schools.local.json` (gitignored). SESSION_SECRET and
// other vars still come from `.env.local`.
//
// Usage: npm run dev:local   (or: node scripts/dev-local.mjs)
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const CONFIG_FILE = "schools.local.json";

let rawSchools;
try {
  rawSchools = readFileSync(CONFIG_FILE, "utf8").trim();
} catch {
  console.error(`[dev-local] Could not read ${CONFIG_FILE}.`);
  console.error("[dev-local] Create it with your schools config JSON (see schools.private.example.json).");
  process.exit(1);
}

try {
  const arr = JSON.parse(rawSchools);
  console.log(`[dev-local] SCHOOLS_CONFIG loaded from ${CONFIG_FILE}: ${arr.length} schools`);
} catch (e) {
  console.error(`[dev-local] ${CONFIG_FILE} is not valid JSON:`, e.message);
  process.exit(1);
}

process.env.SCHOOLS_CONFIG = rawSchools;

const child = spawn("npx", ["next", "dev"], { stdio: "inherit", env: process.env });
child.on("exit", (code) => process.exit(code ?? 0));
