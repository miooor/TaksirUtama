type Attempt = { count: number; resetAt: number };

const attempts = new Map<string, Attempt>();
const windowMs = 60_000;
const maxAttempts = 10;

export function getLoginRateLimitKey(request: Request, schoolCode: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return `${ip}:${schoolCode.trim().toLocaleLowerCase("en")}`;
}

export function consumeLoginAttempt(key: string, now = Date.now()) {
  if (attempts.size > 2_000) {
    for (const [attemptKey, attempt] of attempts) {
      if (attempt.resetAt <= now) attempts.delete(attemptKey);
    }
  }
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  return {
    allowed: current.count <= maxAttempts,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function clearLoginAttempts(key: string) {
  attempts.delete(key);
}
