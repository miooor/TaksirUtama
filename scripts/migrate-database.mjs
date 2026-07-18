import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const here = dirname(fileURLToPath(import.meta.url));
const sql = neon(process.env.DATABASE_URL);
const databaseDir = resolve(here, "../database");
const files = (await readdir(databaseDir)).filter((file) => /^\d+_.+\.sql$/.test(file)).sort();

function splitSqlStatements(source) {
  const statements = [];
  let start = 0;
  let quote = null;
  let dollarQuote = null;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (dollarQuote) {
      if (source.startsWith(dollarQuote, index)) {
        index += dollarQuote.length - 1;
        dollarQuote = null;
      }
      continue;
    }
    if (quote) {
      if (character === quote) {
        if (source[index + 1] === quote) index += 1;
        else quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === "$") {
      const match = source.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollarQuote = match[0];
        index += dollarQuote.length - 1;
        continue;
      }
    }
    if (character === ";") {
      const statement = source.slice(start, index).trim();
      if (statement) statements.push(statement);
      start = index + 1;
    }
  }
  const remaining = source.slice(start).trim();
  if (remaining) statements.push(remaining);
  return statements;
}

for (const file of files) {
  const statements = splitSqlStatements(await readFile(resolve(databaseDir, file), "utf8"));
  for (const statement of statements) {
    await sql.query(statement);
  }
  process.stdout.write(`Applied ${file}\n`);
}
