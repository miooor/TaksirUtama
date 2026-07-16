import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/config/env";

const prefix = "enc:v1";

function key() {
  if (!env.WORKBOOK_ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === "production") throw new Error("WORKBOOK_ENCRYPTION_KEY is required for database-backed workbook sources.");
    return null;
  }
  const decoded = Buffer.from(env.WORKBOOK_ENCRYPTION_KEY, "base64url");
  if (decoded.length !== 32) throw new Error("WORKBOOK_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  return decoded;
}

export function encryptSpreadsheetId(spreadsheetId: string) {
  const encryptionKey = key();
  if (!encryptionKey) return spreadsheetId;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(spreadsheetId, "utf8"), cipher.final()]);
  return [prefix, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptSpreadsheetId(value: string) {
  if (!value.startsWith(`${prefix}:`)) return value;
  const encryptionKey = key();
  if (!encryptionKey) throw new Error("WORKBOOK_ENCRYPTION_KEY is required to read encrypted workbook sources.");
  const [, , iv, tag, encrypted] = value.split(":");
  if (!iv || !tag || !encrypted) throw new Error("Encrypted workbook source is malformed.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}
