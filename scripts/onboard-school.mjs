import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { spawnSync } from "node:child_process";
import { google } from "googleapis";

function usage() {
  process.stderr.write("Usage: npm run school:onboard -- --file /secure/path/schools.private.json [--apply]\n");
  process.exit(1);
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const file = argument("--file");
if (!file) usage();
const inputPath = resolve(file);
const apply = process.argv.includes("--apply");
const raw = JSON.parse(readFileSync(inputPath, "utf8"));
if (!Array.isArray(raw) || !raw.length) throw new Error("The private registry must contain at least one school.");

function derivePasswordHash(password, salt = randomBytes(16)) {
  return new Promise((resolveHash, reject) => {
    scryptCallback(password, salt, 64, { N: 16_384, r: 8, p: 1 }, (error, result) => {
      if (error) reject(error);
      else resolveHash(`scrypt$16384$8$1$${salt.toString("base64url")}$${result.toString("base64url")}`);
    });
  });
}

function temporaryPassword(schoolCode) {
  return `${schoolCode}ppdpu`;
}

function assertUnique(schools, field) {
  const seen = new Set();
  for (const school of schools) {
    const value = String(school[field] ?? "").toLowerCase();
    if (!value || seen.has(value)) throw new Error(`Missing or duplicate school ${field}: ${school[field] ?? "empty"}`);
    seen.add(value);
  }
}

for (const field of ["id", "code", "slug"]) assertUnique(raw, field);

const credentials = [];
const prepared = [];
for (const school of raw) {
  for (const field of ["name", "logoPath", "letterheadPath", "headteacher", "assessmentPeriods", "pbdPeriods"]) {
    if (!school[field]) throw new Error(`${school.code}: missing ${field}`);
  }
  for (const assetField of ["logoPath", "letterheadPath"]) {
    const assetPath = resolve(process.cwd(), "public", String(school[assetField]).replace(/^\//, ""));
    if (!existsSync(assetPath)) throw new Error(`${school.code}: ${assetField} does not exist under public/.`);
  }
  let passwordHash = school.passwordHash;
  if (!passwordHash) {
    const password = temporaryPassword(school.code);
    passwordHash = await derivePasswordHash(password);
    credentials.push({ schoolCode: school.code, temporaryPassword: password });
  }
  prepared.push({ locale: "ms", timezone: "Asia/Kuala_Lumpur", systemName: "Analisa Kurikulum", ...school, passwordHash });
}

async function checkWorkbooks(schools) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) return schools.map((school) => ({ schoolCode: school.code, workbookCheck: "skipped: Google credentials not present" }));
  const auth = new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] });
  const sheets = google.sheets({ version: "v4", auth });
  const results = [];
  for (const school of schools) {
    const sources = [
      ...school.assessmentPeriods.map((period) => ({ label: `${period.assessment.toUpperCase()} ${period.year}`, id: period.spreadsheetId, type: period.assessment })),
      ...school.pbdPeriods.map((period) => ({ label: `PBD ${period.year}`, id: period.spreadsheetId, type: "pbd" })),
    ];
    for (const source of sources) {
      if (!source.id) {
        results.push({ schoolCode: school.code, source: source.label, status: "fatal", issue: "spreadsheetId missing" });
        continue;
      }
      try {
        const [metadata, config] = await Promise.all([
          sheets.spreadsheets.get({ spreadsheetId: source.id, fields: "sheets.properties.title" }),
          sheets.spreadsheets.values.get({ spreadsheetId: source.id, range: "'_CONFIG'!A1:B20" }),
        ]);
        const entries = new Map((config.data.values ?? []).map((row) => [String(row[0] ?? "").toLowerCase(), String(row[1] ?? "")]));
        const valid = entries.get("schemaversion") === "1" && entries.get("schoolcode")?.toLowerCase() === school.code.toLowerCase() && entries.get("workbooktype") === source.type;
        results.push({ schoolCode: school.code, source: source.label, status: valid ? "ready" : "fatal", tabs: metadata.data.sheets?.length ?? 0, issue: valid ? undefined : "_CONFIG mismatch" });
      } catch {
        results.push({ schoolCode: school.code, source: source.label, status: "fatal", issue: "workbook inaccessible" });
      }
    }
  }
  return results;
}

const workbookChecks = await checkWorkbooks(prepared);
const stem = inputPath.replace(/\.json$/i, "");
const preparedPath = `${stem}.school-prepared.json`;
const credentialsPath = `${stem}.school-credentials.json`;
const reportPath = `${stem}.school-onboarding-report.json`;
writeFileSync(preparedPath, `${JSON.stringify(prepared, null, 2)}\n`, { mode: 0o600 });
if (credentials.length) writeFileSync(credentialsPath, `${JSON.stringify(credentials, null, 2)}\n`, { mode: 0o600 });
writeFileSync(reportPath, `${JSON.stringify({ schools: prepared.map(({ id, code, slug, name }) => ({ id, code, slug, name })), workbookChecks }, null, 2)}\n`);

if (apply) {
  const configValue = JSON.stringify(prepared);
  for (const target of ["production", "preview"]) {
    spawnSync("npx", ["vercel", "env", "rm", "SCHOOLS_CONFIG", target, "--yes"], { stdio: "ignore" });
    const result = spawnSync("npx", ["vercel", "env", "add", "SCHOOLS_CONFIG", target, "--sensitive"], { input: configValue, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] });
    if (result.status !== 0) throw new Error(`Unable to upload SCHOOLS_CONFIG for ${target}.`);
  }
  const deployment = spawnSync("npx", ["vercel", "--prod", "--yes"], { stdio: "inherit" });
  if (deployment.status !== 0) throw new Error("Vercel production deployment failed.");
}

process.stdout.write(`Prepared ${prepared.length} school(s). Redacted report: ${reportPath}\n`);
if (credentials.length) process.stdout.write(`Temporary credentials were written with owner-only permissions: ${credentialsPath}\n`);
if (!apply) process.stdout.write("Dry run complete. Re-run with --apply after reviewing the redacted report.\n");
