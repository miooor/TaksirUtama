import { redirect } from "next/navigation";
import { getSchoolContext } from "@/lib/auth";
import { env, hasClerk } from "@/lib/config/env";
import type { SchoolContext } from "@/lib/config/schools";
import { getSchoolByClerkOrganizationId } from "@/lib/db/schools";
import { applyActiveWorkbookSources } from "@/lib/dataSources/repository";

export type AppRole = "school_admin" | "teacher" | "viewer" | "platform_admin";

export type ActorContext = {
  school: SchoolContext;
  actor: {
    id: string;
    role: AppRole;
    provider: "clerk" | "shared_session";
  };
};

function clerkRole(value: string | null | undefined): AppRole {
  if (value === "org:admin" || value === "org:school_admin") return "school_admin";
  if (value === "org:teacher") return "teacher";
  if (value === "org:platform_admin") return "platform_admin";
  return "viewer";
}

export async function getActorContext(): Promise<ActorContext | null> {
  if (hasClerk) {
    const { auth } = await import("@clerk/nextjs/server");
    const session = await auth();
    if (session.userId && session.orgId) {
      const configuredSchool = await getSchoolByClerkOrganizationId(session.orgId);
      const school = configuredSchool ? await applyActiveWorkbookSources(configuredSchool) : null;
      if (school) {
        return {
          school,
          actor: { id: session.userId, role: clerkRole(session.orgRole), provider: "clerk" },
        };
      }
    }
  }

  const configuredSchool = await getSchoolContext();
  if (!configuredSchool) return null;
  const school = await applyActiveWorkbookSources(configuredSchool);
  const sharedAdmin = process.env.NODE_ENV !== "production" || env.ALLOW_SHARED_DATA_SOURCE_ADMIN === "true";
  return {
    school,
    actor: {
      id: `shared:${school.id}`,
      role: sharedAdmin ? "school_admin" : "viewer",
      provider: "shared_session",
    },
  };
}

export async function requireActorContext() {
  const context = await getActorContext();
  if (!context) redirect("/login");
  return context;
}

export async function requireRole(...roles: AppRole[]) {
  const context = await requireActorContext();
  if (!roles.includes(context.actor.role)) {
    throw new Response("Forbidden", { status: 403 });
  }
  return context;
}
