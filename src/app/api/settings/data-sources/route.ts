import { z } from "zod";
import { requireActorContext, requireRole } from "@/lib/auth/actor";
import { dataSourceApiError } from "@/lib/dataSources/api";
import { createValidatedDraft, listWorkbookSources, toPublicWorkbookSource } from "@/lib/dataSources/repository";
import { extractGoogleSpreadsheetId } from "@/lib/dataSources/url";
import { validateWorkbookConnection } from "@/lib/dataSources/validation";
import { rejectUntrustedMutation } from "@/lib/security/origin";
import { requestId, withOperationLog } from "@/lib/observability/logger";

const validateSchema = z.object({
  year: z.string().regex(/^\d{4}$/),
  type: z.enum(["upsa", "uasa", "pbd"]),
  googleSheetsUrl: z.string().min(1),
});

export async function GET() {
  const context = await requireActorContext();
  const sources = await listWorkbookSources(context.school.id);
  return Response.json({ sources: sources.map(toPublicWorkbookSource) });
}

export async function POST(request: Request) {
  const rejected = rejectUntrustedMutation(request);
  if (rejected) return rejected;
  try {
    const context = await requireRole("school_admin", "platform_admin");
    const input = validateSchema.parse(await request.json());
    const configured = input.type === "pbd"
      ? context.school.pbdPeriods.some((period) => period.year === input.year)
      : context.school.assessmentPeriods.some((period) => period.year === input.year && period.assessment === input.type);
    if (!configured) return Response.json({ error: "Tempoh ini belum dikonfigurasi untuk sekolah anda." }, { status: 404 });
    const spreadsheetId = extractGoogleSpreadsheetId(input.googleSheetsUrl);
    if (!spreadsheetId) return Response.json({ error: "Masukkan pautan Google Sheets yang sah." }, { status: 400 });
    const id = requestId(request);
    const source = await withOperationLog(
      { requestId: id, route: "/api/settings/data-sources", operation: "workbook_validate", schoolId: context.school.id, actorId: context.actor.id, role: context.actor.role },
      async () => {
        const validation = await validateWorkbookConnection(context.school, input.type, input.year, spreadsheetId);
        return createValidatedDraft(context, { year: input.year, type: input.type, spreadsheetId }, validation, id);
      },
    );
    return Response.json({ source: toPublicWorkbookSource(source) }, { status: 201 });
  } catch (error) {
    return dataSourceApiError(error);
  }
}
