import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env, getSchoolById } from "@/lib/config/env";
import type { SchoolContext } from "@/lib/config/schools";

function deriveScrypt(password: string, salt: Buffer, length: number, options: { N: number; r: number; p: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, length, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export const authCookieName = "ssp_session";
export const sessionLifetimeSeconds = 60 * 60 * 12;
const sessionVersion = 1;

type SessionPayload = {
  v: number;
  schoolId: string;
  issuedAt: number;
  expiresAt: number;
};

function encode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(encodedPayload: string) {
  return createHmac("sha256", env.SESSION_SECRET).update(encodedPayload).digest("base64url");
}

export function createSessionToken(schoolId: string, now = Date.now()) {
  const payload: SessionPayload = {
    v: sessionVersion,
    schoolId,
    issuedAt: Math.floor(now / 1000),
    expiresAt: Math.floor(now / 1000) + sessionLifetimeSeconds,
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): SchoolContext | null {
  if (!token) return null;
  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) return null;
  const expected = sign(encodedPayload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<SessionPayload>;
    const nowSeconds = Math.floor(now / 1000);
    if (
      payload.v !== sessionVersion ||
      typeof payload.schoolId !== "string" ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number" ||
      payload.issuedAt > nowSeconds + 60 ||
      payload.expiresAt <= nowSeconds
    ) {
      return null;
    }
    return getSchoolById(payload.schoolId);
  } catch {
    return null;
  }
}

export async function getSchoolContext() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(authCookieName)?.value);
}

export async function requireSchoolContext() {
  const { requireActorContext } = await import("@/lib/auth/actor");
  return (await requireActorContext()).school;
}

export async function hashSchoolPassword(password: string, salt = randomBytes(16)) {
  const cost = 16_384;
  const blockSize = 8;
  const parallelization = 1;
  const derived = await deriveScrypt(password, salt, 64, { N: cost, r: blockSize, p: parallelization });
  return `scrypt$${cost}$${blockSize}$${parallelization}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifySchoolPassword(password: string, storedHash: string) {
  const [algorithm, rawCost, rawBlockSize, rawParallelization, rawSalt, rawHash, extra] = storedHash.split("$");
  if (algorithm !== "scrypt" || !rawCost || !rawBlockSize || !rawParallelization || !rawSalt || !rawHash || extra) return false;
  const cost = Number(rawCost);
  const blockSize = Number(rawBlockSize);
  const parallelization = Number(rawParallelization);
  if (cost !== 16_384 || blockSize !== 8 || parallelization !== 1) return false;
  try {
    const expected = Buffer.from(rawHash, "base64url");
    const actual = await deriveScrypt(password, Buffer.from(rawSalt, "base64url"), expected.length, { N: cost, r: blockSize, p: parallelization });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
