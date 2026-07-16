import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/actor";
import { dataSourceApiError } from "@/lib/dataSources/api";
import { getWorkbookSource, toPublicWorkbookSource, updateSourceValidation } from "@/lib/dataSources/repository";
import { validateWorkbookConnection } from "@/lib/dataSources/validation";
import { requestId, withOperationLog } from "@/lib/observability/logger";
import { rejectUntrustedMutation } from "@/lib/security/origin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rejected = rejectUntrustedMutation(request);
  if (rejected) return rejected;
  try {
    const context = await requireRole("school_admin", "platform_admin");
    const source = await getWorkbookSource(context.school.id, (await params).id);
    if (!source) return Response.json({ error: "Sumber data tidak ditemui." }, { status: 404 });
    const id = requestId(request);
    const updated = await withOperationLog(
      { requestId: id, route: "/api/settings/data-sources/[id]/recheck", operation: "workbook_recheck", schoolId: context.school.id, actorId: context.actor.id, role: context.actor.role },
      async () => updateSourceValidation(context, source, await validateWorkbookConnection(context.school, source.type, source.year, source.spreadsheetId), id),
    );
    revalidatePath("/settings/data-sources");
    return Response.json({ source: toPublicWorkbookSource(updated) });
  } catch (error) {
    return dataSourceApiError(error);
  }
}
