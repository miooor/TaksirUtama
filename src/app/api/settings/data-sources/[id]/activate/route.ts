import { revalidatePath, revalidateTag } from "next/cache";
import { requireRole } from "@/lib/auth/actor";
import { dataSourceApiError } from "@/lib/dataSources/api";
import { activateWorkbookSource, getWorkbookSource, toPublicWorkbookSource } from "@/lib/dataSources/repository";
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
    const activated = await withOperationLog(
      { requestId: id, route: "/api/settings/data-sources/[id]/activate", operation: "workbook_activate", schoolId: context.school.id, actorId: context.actor.id, role: context.actor.role },
      async () => {
        const validation = await validateWorkbookConnection(context.school, source.type, source.year, source.spreadsheetId);
        if (validation.status !== "ready" && validation.status !== "warning") {
          throw new Error("Buku kerja masih mempunyai isu fatal dan tidak boleh diaktifkan.");
        }
        return activateWorkbookSource(context, source, validation, id);
      },
    );
    revalidateTag(`school:${context.school.id}:workbooks`, { expire: 0 });
    revalidateTag(`school:${context.school.id}:pbd`, { expire: 0 });
    revalidateTag(`school:${context.school.id}:assessments`, { expire: 0 });
    revalidatePath("/dashboard");
    revalidatePath("/settings/data-sources");
    return Response.json({ source: toPublicWorkbookSource(activated) });
  } catch (error) {
    return dataSourceApiError(error);
  }
}
