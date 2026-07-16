import { describe, expect, it } from "vitest";
import { clearLoginAttempts, consumeLoginAttempt } from "@/lib/authRateLimit";

describe("login rate limiting", () => {
  it("allows ten attempts per key and blocks the next one", () => {
    const key = "127.0.0.1:SCH-A-test";
    clearLoginAttempts(key);
    for (let attempt = 0; attempt < 10; attempt += 1) expect(consumeLoginAttempt(key, 1_000).allowed).toBe(true);
    expect(consumeLoginAttempt(key, 1_000)).toMatchObject({ allowed: false, retryAfterSeconds: 60 });
    clearLoginAttempts(key);
  });
});
