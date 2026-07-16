import { NextResponse } from "next/server";
import { authCookieName } from "@/lib/auth";
import { rejectUntrustedMutation } from "@/lib/security/origin";

export async function POST(request: Request) {
  const rejected = rejectUntrustedMutation(request);
  if (rejected) return rejected;
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(authCookieName, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
