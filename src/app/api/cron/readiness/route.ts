import { NextResponse } from "next/server";
import { env, schools } from "@/lib/config/env";
import { validateWorkbookConnection } from "@/lib/dataSources/validation";
import { listWorkbookSources, updateSourceValidation } from "@/lib/dataSources/repository";
import { logEvent, requestId as getRequestId } from "@/lib/observability/logger";
import type { ActorContext } from "@/lib/auth/actor";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  const summary = { checked: 0, ready: 0, warning: 0, fatal: 0, inaccessible: 0 };
  for (const school of schools) {
    const actorContext: ActorContext = {
      school,
      actor: { id: "system:readiness-cron", role: "platform_admin", provider: "shared_session" },
    };
    const activeSources = (await listWorkbookSources(school.id)).filter((source) => source.state === "active");
    for (const source of activeSources) {
      const validation = await validateWorkbookConnection(school, source.type, source.year, source.spreadsheetId);
      await updateSourceValidation(actorContext, source, validation, requestId);
      summary.checked += 1;
      if (validation.status === "ready") summary.ready += 1;
      else if (validation.status === "warning") summary.warning += 1;
      else if (validation.status === "fatal") summary.fatal += 1;
      else summary.inaccessible += 1;
      logEvent("info", "readiness.scheduled", {
        requestId,
        schoolId: school.id,
        operation: "workbook.recheck",
        readinessStatus: validation.status,
      });
    }
  }
  return NextResponse.json({ status: "ok", requestId, summary });
}
