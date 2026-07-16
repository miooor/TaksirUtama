import { revalidatePath, revalidateTag } from "next/cache";
import { requireRole } from "@/lib/auth/actor";
import { dataSourceApiError } from "@/lib/dataSources/api";
import { disableWorkbookSource, getWorkbookSource } from "@/lib/dataSources/repository";
import { requestId } from "@/lib/observability/logger";
import { rejectUntrustedMutation } from "@/lib/security/origin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rejected = rejectUntrustedMutation(request);
  if (rejected) return rejected;
  try {
    const context = await requireRole("school_admin", "platform_admin");
    const source = await getWorkbookSource(context.school.id, (await params).id);
    if (!source) return Response.json({ error: "Sumber data tidak ditemui." }, { status: 404 });
    await disableWorkbookSource(context, source, requestId(request));
    revalidateTag(`school:${context.school.id}:workbooks`, { expire: 0 });
    revalidateTag(`school:${context.school.id}:pbd`, { expire: 0 });
    revalidateTag(`school:${context.school.id}:assessments`, { expire: 0 });
    revalidatePath("/dashboard");
    revalidatePath("/settings/data-sources");
    return Response.json({ ok: true });
  } catch (error) {
    return dataSourceApiError(error);
  }
}
