import { NextResponse } from "next/server";
import { getSchoolByCode } from "@/lib/config/env";
import { authCookieName, createSessionToken, sessionLifetimeSeconds, verifySchoolPassword } from "@/lib/auth";
import { clearLoginAttempts, consumeLoginAttempt, getLoginRateLimitKey } from "@/lib/authRateLimit";
import { rejectUntrustedMutation } from "@/lib/security/origin";
import { logEvent, requestId } from "@/lib/observability/logger";

export async function POST(request: Request) {
  const rejected = rejectUntrustedMutation(request);
  if (rejected) return rejected;
  const logContext = { requestId: requestId(request), route: "/api/auth/login", operation: "login" };
  const formData = await request.formData();
  const schoolCode = String(formData.get("schoolCode") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");
  const rateLimitKey = getLoginRateLimitKey(request, schoolCode);
  const limit = consumeLoginAttempt(rateLimitKey);
  if (!limit.allowed) {
    logEvent("warning", "login_rate_limited", { ...logContext, status: 429 });
    return new NextResponse("Terlalu banyak percubaan log masuk. Cuba semula sebentar lagi.", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds), "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const school = getSchoolByCode(schoolCode);
  if (!school || !(await verifySchoolPassword(password, school.passwordHash))) {
    logEvent("warning", "login_failed", { ...logContext, status: 303 });
    return NextResponse.redirect(new URL(`/login?error=1&next=${encodeURIComponent(next)}`, request.url), 303);
  }
  clearLoginAttempts(rateLimitKey);
  logEvent("info", "login_succeeded", { ...logContext, schoolId: school.id, status: 303 });
  const response = NextResponse.redirect(new URL(next.startsWith("/") ? next : "/dashboard", request.url), 303);
  response.cookies.set(authCookieName, createSessionToken(school.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionLifetimeSeconds,
    priority: "high",
  });
  return response;
}
